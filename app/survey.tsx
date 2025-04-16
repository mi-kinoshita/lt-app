import React from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  SafeAreaView,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SURVEY_COMPLETED_KEY = "hasCompletedSurvey";

export default function SurveyScreen() {
  const completeSurvey = async () => {
    try {
      await AsyncStorage.setItem(SURVEY_COMPLETED_KEY, "true");
      router.replace("/");
    } catch (e) {
      console.error("Failed to save survey status or navigate:", e);
      router.replace("/");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome!</Text>
        <Text style={styles.description}>
          This app helps you learn Japanese by chatting with the AI character
          Luna.
        </Text>

        <View style={styles.buttonContainer}>
          <Button title="START" onPress={completeSurvey} color="#4a43a1" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 30,
    alignItems: "center",
    maxWidth: 500,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#DDDDDD",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    width: "80%",
    maxWidth: 300,
  },
});
