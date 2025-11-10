import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

type QuadrantLogoVariant = "dark" | "light";

type QuadrantLogoProps = {
  size?: number;
  variant?: QuadrantLogoVariant;
  style?: StyleProp<ImageStyle>;
};

const sources: Record<QuadrantLogoVariant, any> = {
  dark: require("../../assets/logo_dark.png"),
  light: require("../../assets/logo_light.png")
};

export const QuadrantLogo = ({ size = 32, variant = "dark", style }: QuadrantLogoProps) => (
  <Image
    source={sources[variant]}
    style={[
      {
        width: size,
        height: size,
        resizeMode: "contain"
      },
      style
    ]}
    accessible
    accessibilityRole="image"
    accessibilityLabel="Quadrant logo"
  />
);

export default QuadrantLogo;
