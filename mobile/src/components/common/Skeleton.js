import React from "react";
import { StyleSheet, View } from "react-native";
import tokens from "../../styles/tokens";

export default function Skeleton({
  width = "100%",
  height = 20,
  variant = "rect",
  style
}) {
  const borderRadius = variant === "circle"
    ? tokens.radius.pill
    : variant === "text"
    ? tokens.radius.md
    : tokens.radius.lg;

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: 0.5,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: tokens.colors.card.border,
  },
});
