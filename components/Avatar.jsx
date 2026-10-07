import { useState } from "react";
import { View, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Avatar({ uri, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const isLoadable = uri && /^https?:\/\//.test(uri);
  const show = isLoadable && !failed;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(124,58,237,0.15)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {show ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Ionicons name="person" size={size * 0.45} color="#7c3aed" />
      )}
    </View>
  );
}