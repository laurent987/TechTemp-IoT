#!/usr/bin/env bash
set -Eeuo pipefail

# deploy.sh — déploiement client/serveur pour techtemp
# Usage:
#   ./deploy.sh [--ask-sudo-pass] [--run-remote-make] [--no-setup] [--verbose] client <last_octet>
#   ./deploy.sh [--ask-sudo-pass] [--run-remote-make] [--no-setup] [--verbose] server

RUN_MAKE=0
DO_SETUP=1
ASK_SUDO_PASS=0
VERBOSE=0
BROKER_IP="192.168.0.42"

print_usage(){ sed -n '1,200p' "$0" | sed 's/^# \{0,1\}//'; }

log() {
  if (( VERBOSE )); then echo "[DEBUG] $*"; fi
}

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()   { echo -e "${GREEN}[INFO]${NC} $*"; }
log_step()   { echo -e "${YELLOW}[STEP]${NC} $*"; }
log_error()  { echo -e "${RED}[ERROR]${NC} $*"; }
log_warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }

fail_if_error() {
  local status=$1 msg="$2"
  if (( status != 0 )); then log_error "$msg"; exit $status; fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-remote-make) RUN_MAKE=1; shift ;;
    --no-setup)        DO_SETUP=0; shift ;;
    --ask-sudo-pass)   ASK_SUDO_PASS=1; shift ;;
    --verbose)         VERBOSE=1; shift ;;
    -h|--help)         print_usage; exit 0 ;;
    *) break ;;
  esac
done

if [[ $# -lt 1 ]]; then echo "Erreur: rôle manquant (client|server)"; print_usage; exit 2; fi

ROLE="$1"; shift
case "$ROLE" in
  client)
    if [[ $# -lt 1 ]]; then echo "Erreur: fournir le dernier octet de l'IP pour le client (ex: 202)"; exit 2; fi
    LAST_OCTET="$1"; shift
    if ! [[ "$LAST_OCTET" =~ ^[0-9]{1,3}$ ]] || (( LAST_OCTET < 1 || LAST_OCTET > 254 )); then echo "Octet invalide: $LAST_OCTET"; exit 2; fi
    HOST="192.168.0.${LAST_OCTET}"
    COPY_SET=(client commun driver config_file)
    ;;
  server)
    HOST="$BROKER_IP"
    COPY_SET=(server commun config_file)
    ;;
  *) echo "Rôle inconnu: $ROLE (attendu: client|server)"; exit 2 ;;
esac

REMOTE_USER="pi"
REMOTE="${REMOTE_USER}@${HOST}"
REMOTE_BASE="/home/${REMOTE_USER}/Documents/techtemp"
UNIT_LOCAL="config_file/techtemp.service"
UNIT_REMOTE="/etc/systemd/system/techtemp.service"
BIN_REMOTE="${REMOTE_BASE}/techtemp"

SSH_OPTS=(
  -o BatchMode=yes
  -o ConnectTimeout=8
  -o StrictHostKeyChecking=accept-new
  -o LogLevel=ERROR
  -o ControlMaster=auto
  -o ControlPersist=60s
  -o ControlPath="${TMPDIR:-/tmp}/ssh-%r@%h:%p.sock"
)
SCP_OPTS=("${SSH_OPTS[@]}")

echo "Rôle      : ${ROLE}"
echo "Cible     : ${REMOTE}"
echo "Dossier   : ${REMOTE_BASE}"
echo "Copie     : ${COPY_SET[*]}"
echo "Setup     : $([[ $DO_SETUP -eq 1 ]] && echo ON || echo OFF)"
echo "Run make  : $([[ $RUN_MAKE -eq 1 ]] && echo ON || echo OFF)"
echo "Mode sudo : $([[ $ASK_SUDO_PASS -eq 1 ]] && echo 'ask-sudo-pass' || echo 'auto')"
echo "Verbose   : $([[ $VERBOSE -eq 1 ]] && echo ON || echo OFF)"
echo

for d in "${COPY_SET[@]}"; do [[ -d "$d" ]] || { echo "Dossier manquant: ./$d"; exit 3; }; done
[[ -f "$UNIT_LOCAL" ]] || echo "[info] $UNIT_LOCAL introuvable localement (installation systemd sautée)"


# Test sudo distant et demande du mot de passe si nécessaire
SUDO_PASS=""
echo "[remote] test sudo (sudo -n -v)…"
if ssh "${SSH_OPTS[@]}" "${REMOTE}" 'sudo -n -v' >/dev/null 2>&1; then
  echo "[remote] sudo non-interactif disponible (timestamp ok)."
else
  read -rs -p "Mot de passe sudo pour ${REMOTE_USER}@${HOST}: " SUDO_PASS
  echo
  [[ -n "$SUDO_PASS" ]] || { echo "Mot de passe vide, annulation."; exit 4; }
fi

# Découpage en fonctions
create_remote_dir() {
  log_step "Vérification/création du dossier distant (${REMOTE_BASE})…"
  echo "[DEBUG] SSH test existence dossier: test -d \"${REMOTE_BASE}\""
  TEST_OUT=$(ssh "${SSH_OPTS[@]}" "${REMOTE}" "test -d \"${REMOTE_BASE}\"" 2>&1 || true)
  status=$?
  echo "[DEBUG] après affectation status: $status"
  echo "[DEBUG] Code retour test: $status"
  echo "[DEBUG] SSH sortie: $TEST_OUT"
  if (( status == 0 )); then
    echo "[DEBUG] branche IF: dossier déjà présent"
    echo "[remote] dossier ${REMOTE_BASE} déjà présent. (code: $status)"
    echo "[DEBUG] SSH sortie: $TEST_OUT"
  else
    echo "[DEBUG] branche ELSE: dossier absent, tentative de création..."
    echo "[remote] dossier absent, tentative de création..."
    echo "[DEBUG] SSH création dossier: mkdir -p -- \"${REMOTE_BASE}\" && chown -R '${REMOTE_USER}':'${REMOTE_USER}' \"${REMOTE_BASE}\""
    CREATE_OUT=$(ssh "${SSH_OPTS[@]}" "${REMOTE}" bash -lc "mkdir -p -- \"${REMOTE_BASE}\" && chown -R '${REMOTE_USER}':'${REMOTE_USER}' \"${REMOTE_BASE}\"" 2>&1)
    status2=$?
    echo "[DEBUG] Code retour création: $status2"
    echo "[DEBUG] SSH sortie: $CREATE_OUT"
    if (( status2 != 0 )); then
      echo "[ERREUR] Impossible de créer le dossier distant ${REMOTE_BASE}. (code: $status2)"
      echo "[ERREUR] SSH: $CREATE_OUT"
      echo "Vérifiez les droits, la connexion ou l'existence de l'utilisateur."
      exit 10
    fi
    # Vérification après création
    echo "[DEBUG] SSH vérification post-création: test -d \"${REMOTE_BASE}\""
    POST_OUT=$(ssh "${SSH_OPTS[@]}" "${REMOTE}" "test -d \"${REMOTE_BASE}\"" 2>&1)
    status3=$?
    echo "[DEBUG] Code retour post-création: $status3"
    echo "[DEBUG] SSH sortie: $POST_OUT"
    if (( status3 != 0 )); then
      echo "[ERREUR] Le dossier distant ${REMOTE_BASE} n'a pas pu être créé après tentative. (code: $status3)"
      echo "[ERREUR] SSH: $POST_OUT"
      exit 11
    fi
    echo "[remote] dossier ${REMOTE_BASE} créé avec succès. (code: $status3)"
    echo "[DEBUG] SSH sortie: $POST_OUT"
  fi
  # Pas de création de sous-dossiers, copie à plat
}

copy_sources() {
  log_step "Copie des fichiers sources dans ${REMOTE_BASE}…"
  RSYNC_CMD=(rsync -az --delete --exclude='.git' -e "ssh ${SSH_OPTS[*]}")
  FILES=()
  for d in "${COPY_SET[@]}"; do
    # Fichiers visibles
    for f in "$d"/*; do
      [[ -e "$f" ]] && FILES+=("$f")
    done
    # Fichiers cachés sauf . et ..
    for f in "$d"/.*; do
      base="$(basename "$f")"
      [[ "$base" == "." || "$base" == ".." ]] && continue
      [[ -e "$f" ]] && FILES+=("$f")
    done
  done
  if (( ${#FILES[@]} > 0 )); then
    "${RSYNC_CMD[@]}" "${FILES[@]}" "${REMOTE}:${REMOTE_BASE}/"
    fail_if_error $? "Échec rsync pour la copie à plat."
    
    # Pour les clients, supprimer client.c pour éviter les conflits avec client_enhanced.c
    if [[ "$ROLE" == "client" ]]; then
      echo "[INFO] Suppression de client.c pour éviter conflit avec client_enhanced.c..."
      ssh "${SSH_OPTS[@]}" "${REMOTE}" "rm -f ${REMOTE_BASE}/client.c" || true
    fi
  else
    echo "[warn] Aucun fichier à copier."
  fi
}

transfer_systemd_unit() {
  log_step "Transfert du fichier systemd unit…"
  if [[ -f "$UNIT_LOCAL" ]]; then
    echo "[remote] transfert du fichier systemd (vers ${REMOTE}:${REMOTE_BASE})…"
    scp "${SCP_OPTS[@]}" "$UNIT_LOCAL" "${REMOTE}:${REMOTE_BASE}/techtemp.service"
    fail_if_error $? "Échec transfert systemd unit."
  fi
}

# Les scripts here-doc sont externalisés pour la maintenance
setup_remote() {
  log_step "Configuration distante (setup_remote)…"
  if (( DO_SETUP )); then
    TMP_CONF="$(mktemp /tmp/techtemp.conf.XXXXXX)"
    trap 'rm -f "$TMP_CONF"' EXIT

    read -rp "Identifiant sensor ? (ex: 123) " SENSOR_ID
    read -rp "Identifiant de la pièce ? (ex: 1,2,3 ou texte) " ROOM_ID

    cat >"$TMP_CONF" <<EOF
BROKER_IP=${BROKER_IP}
SENSOR_ID=${SENSOR_ID}
ROOM_ID=${ROOM_ID}
EOF

    echo "[setup] envoi de la configuration et installation des paquets…"
    scp "${SCP_OPTS[@]}" "$TMP_CONF" "${REMOTE}:${REMOTE_BASE}/surveillance.conf"
    fail_if_error $? "Échec transfert conf."

    echo "[DEBUG local] REMOTE_BASE avant SSH: '$REMOTE_BASE'"
    if [[ -z "$REMOTE_BASE" ]]; then
      echo "[ERREUR] REMOTE_BASE est vide avant SSH. Abandon."; exit 99
    fi
    # Externalisation du script distant
    SETUP_SCRIPT="$(mktemp /tmp/techtemp_remote_setup.XXXXXX-$$.sh)"
cat >"$SETUP_SCRIPT" <<'EOS'
set -Ee -o pipefail
echo "[DEBUG remote] ARGS: SUDO_PASS='${1:-}' REMOTE_BASE='${2:-}' UNIT_REMOTE='${3:-}'"
REMOTE_SUDO_PASS="$1"
REMOTE_BASE="$2"
shift 2
echo "[DEBUG remote] REMOTE_SUDO_PASS=*****"
echo "[DEBUG remote] REMOTE_BASE='$REMOTE_BASE'"
echo "[DEBUG remote] source install='${REMOTE_BASE}/surveillance.conf'"
# sudo_pipe() { printf "%s\n" "$REMOTE_SUDO_PASS" | sudo -S -p "" -- "$@"; }
# sudo_pipe install -m 0644 -o root -g root "${REMOTE_BASE}/surveillance.conf" /etc/surveillance.conf
# sudo_pipe apt-get update -y
# sudo_pipe apt-get install -y git build-essential cmake libssl-dev vim
# sudo_pipe apt-get install -y libpaho-mqtt1.3 libpaho-mqtt-dev
echo "[setup] terminé."
EOS
    # Utilisation d'un placeholder pour garantir la transmission du mot de passe sudo (même vide)
    ssh "${SSH_OPTS[@]}" "${REMOTE}" bash -s -- "${SUDO_PASS:-_N0PASS_}" "${REMOTE_BASE:-/home/${REMOTE_USER}/Documents/techtemp}" < "$SETUP_SCRIPT"
    fail_if_error $? "Échec setup distant."
    rm -f "$SETUP_SCRIPT"
  else
    echo "[setup] ignoré (--no-setup)."
  fi
}

install_systemd() {
  log_step "Installation du service systemd…"
  if [[ -f "$UNIT_LOCAL" ]]; then
    SYS_SCRIPT="$(mktemp /tmp/techtemp_remote_sys.XXXXXX-$$.sh)"
    cat >"$SYS_SCRIPT" <<'EOS'
set -Eeuo pipefail
echo "[DEBUG remote] ARGS: SUDO_PASS='${1:-}' REMOTE_BASE='${2:-}' UNIT_REMOTE='${3:-}'"

REMOTE_SUDO_PASS="${1:-}"  # Mot de passe sudo ou _NOPASS_
REMOTE_BASE="${2:-}"        # Dossier de base
UNIT_REMOTE="${3:-}"        # Chemin unit systemd
echo "[DEBUG remote] REMOTE_SUDO_PASS='$REMOTE_SUDO_PASS'"
echo "[DEBUG remote] REMOTE_BASE='$REMOTE_BASE'"
echo "[DEBUG remote] UNIT_REMOTE='$UNIT_REMOTE'"
sudo_pipe() { printf "%s\n" "$REMOTE_SUDO_PASS" | sudo -S -p "" -- "$@"; }
sudo_pipe install -m 0644 -o root -g root "${REMOTE_BASE}/techtemp.service" "${UNIT_REMOTE}"
sudo_pipe systemctl daemon-reload
sudo_pipe systemctl enable techtemp.service || true
EOS
    ssh "${SSH_OPTS[@]}" "${REMOTE}" bash -s -- "${SUDO_PASS:-_N0PASS_}" "${REMOTE_BASE}" "${UNIT_REMOTE}" < "$SYS_SCRIPT"
    fail_if_error $? "Échec installation systemd distant."
    rm -f "$SYS_SCRIPT"
  else
    echo "[systemd] aucun ${UNIT_LOCAL} local — étape sautée."
  fi
}

remote_build() {
  log_step "Compilation et (re)démarrage du service sur la machine distante…"
  if (( RUN_MAKE )); then
    BUILD_SCRIPT="$(mktemp /tmp/techtemp_remote_build.XXXXXX-$$.sh)"
    cat >"$BUILD_SCRIPT" <<EOS
set -Eeuo pipefail
echo "[DEBUG remote] ARGS: \"\$@\" = \$@"
REMOTE_SUDO_PASS="\${1:-}";
REMOTE_BASE="\${2:-}"
REMOTE_ROLE="\${3:-}"
echo "[DEBUG remote] REMOTE_SUDO_PASS='\$REMOTE_SUDO_PASS'"
echo "[DEBUG remote] REMOTE_BASE='\$REMOTE_BASE'"
echo "[DEBUG remote] REMOTE_ROLE='\$REMOTE_ROLE'"
sudo_pipe() { printf "%s\n" "\$REMOTE_SUDO_PASS" | sudo -S -p "" -- "\$@"; }
cd "\${REMOTE_BASE}"
if [[ -f Makefile ]]; then
  if [[ "\$REMOTE_ROLE" == "client" ]]; then
    echo "[INFO] Arrêt du service avant compilation..."
    sudo_pipe systemctl stop techtemp.service || true
    echo "[INFO] Compilation version enhanced pour client..."
    make enhanced -B -j"\$(nproc)"
    # Copier la version enhanced vers techtemp pour le service
    if [[ -f techtemp_enhanced ]]; then
      cp techtemp_enhanced techtemp
      echo "[INFO] techtemp_enhanced -> techtemp"
    fi
  else
    echo "[INFO] Arrêt du service avant compilation..."
    sudo_pipe systemctl stop techtemp.service || true
    echo "[INFO] Compilation version standard pour serveur..."
    make -B -j"\$(nproc)"
  fi
else
  echo "[warn] Makefile non trouvé dans \${REMOTE_BASE}"
fi
sudo_pipe systemctl try-restart techtemp.service || sudo_pipe systemctl start techtemp.service || true
EOS
    ssh "${SSH_OPTS[@]}" "${REMOTE}" bash -s -- "${SUDO_PASS:-_N0PASS_}" "${REMOTE_BASE}" "${ROLE}" < "$BUILD_SCRIPT"
    fail_if_error $? "Échec build distant."
    rm -f "$BUILD_SCRIPT"
  else
    echo "[systemd] vérification binaire et (re)démarrage éventuel…"
    BIN_SCRIPT="$(mktemp /tmp/techtemp_remote_bin.XXXXXX.sh)"
    cat >"$BIN_SCRIPT" <<'EOS'
set -Eeuo pipefail
echo "[DEBUG remote] ARGS: \"$@\" = $@"
echo "[DEBUG remote] ARGS: $1 = ${1:-}"
echo "[DEBUG remote] ARGS: $2 = ${2:-}"
REMOTE_SUDO_PASS="$1"; shift
BIN_REMOTE="$1"
echo "[DEBUG remote] REMOTE_SUDO_PASS=,$REMOTE_SUDO_PASS"
echo "[DEBUG remote] BIN_REMOTE=,$BIN_REMOTE"
sudo_pipe() { printf "%s\n" "$REMOTE_SUDO_PASS" | sudo -S -p "" -- "$@"; }
if [[ -x "${BIN_REMOTE}" ]]; then
  sudo_pipe systemctl try-restart techtemp.service || sudo_pipe systemctl start techtemp.service || true
else
  printf "[warn] binaire non trouvé (%s). Service non démarré.\n" "${BIN_REMOTE}"
fi
EOS
    ssh "${SSH_OPTS[@]}" "${REMOTE}" bash -s -- "$SUDO_PASS" "${BIN_REMOTE}" < "$BIN_SCRIPT"
    fail_if_error $? "Échec vérification binaire distant."
    rm -f "$BIN_SCRIPT"
  fi
}

# Main
create_remote_dir
copy_sources
transfer_systemd_unit
setup_remote
install_systemd
remote_build

SUDO_PASS=""
log_info "Déploiement terminé sur ${REMOTE} -> ${REMOTE_BASE}"
log_info "Vérifiez l'état du service avec :"
log_info "  ssh ${REMOTE} 'systemctl status techtemp.service'"
log_info "Ou pour les logs :"
log_info "  ssh ${REMOTE} 'journalctl -u techtemp.service -f'"
log_info "Ou pour les logs MQTT :"
log_info "  ssh ${REMOTE} 'tail -f /var/log/mosquitto/mosquitto.log'"
log_info "Ou pour les logs de surveillance :"
log_info "  ssh ${REMOTE} 'tail -f /var/log/surveillance.log'"

