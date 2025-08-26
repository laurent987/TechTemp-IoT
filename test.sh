if grep -q "interface $IFACE" monfichier.conf; then
  echo "L'interface $IFACE est présente."
else
  echo "L'interface $IFACE n'est PAS présente."
fi

