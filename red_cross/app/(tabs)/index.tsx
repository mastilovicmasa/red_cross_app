import { router } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import React, { useEffect } from "react";
import { Alert, StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "@/components/Themed";
import { auth } from '../../FirebaseConfig';

export default function TabOneScreen() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed, user:", user?.email ?? null);
      if (!user) router.replace("/login");
    });
    return unsub;
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("Signed out");
    } catch (e: any) {
      console.log("Sign out error:", e);
      Alert.alert("Sign out failed", e?.message ?? "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Out</Text>
      <TouchableOpacity onPress={handleSignOut}>
        <Text>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "bold" },
});