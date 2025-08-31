import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Box
} from '@chakra-ui/react';

/**
 * Composant Card standardisé pour toute l'application
 * Structure uniforme avec header optionnel et body consistent
 */
const StandardCard = ({
  title,
  subtitle,
  titleColor = "gray.700",
  icon,
  children,
  size = 'md',
  variant = 'outline',
  ...props
}) => {
  const sizeProps = {
    sm: {
      headerPadding: 3,
      bodyPadding: 3,
      titleSize: 'sm',
      subtitleSize: 'xs'
    },
    md: {
      headerPadding: 4,
      bodyPadding: 4,
      titleSize: 'md',
      subtitleSize: 'sm'
    },
    lg: {
      headerPadding: 5,
      bodyPadding: 5,
      titleSize: 'lg',
      subtitleSize: 'md'
    }
  };

  const currentSize = sizeProps[size];

  return (
    <Card variant={variant} {...props}>
      {(title || subtitle) && (
        <CardHeader pb={2} pt={currentSize.headerPadding} px={currentSize.headerPadding}>
          <Box>
            <Heading size={currentSize.titleSize} color={titleColor} display="flex" alignItems="center" gap={2}>
              {icon && <Text as="span">{icon}</Text>}
              {title}
            </Heading>
            {subtitle && (
              <Text fontSize={currentSize.subtitleSize} color="gray.600" mt={1}>
                {subtitle}
              </Text>
            )}
          </Box>
        </CardHeader>
      )}
      <CardBody pt={title || subtitle ? 2 : currentSize.bodyPadding} pb={currentSize.bodyPadding} px={currentSize.bodyPadding}>
        {children}
      </CardBody>
    </Card>
  );
};

export default StandardCard;
