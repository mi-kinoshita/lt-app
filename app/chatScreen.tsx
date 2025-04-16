import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Text,
  SafeAreaView,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import Octicons from "@expo/vector-icons/Octicons";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { useRouter, Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callGeminiAPI } from "../api/gemini";
import { Message } from "../types/message";
import { useProgressData } from "../hooks/useProgressData";

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { progress, incrementSentCount } = useProgressData();

  const CONVERSATION_STORAGE_KEY = "chatConversation";

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  useEffect(() => {
    const loadConversation = async () => {
      try {
        const storedConversation = await AsyncStorage.getItem(
          CONVERSATION_STORAGE_KEY
        );
        if (storedConversation) {
          const parsedConversation = JSON.parse(
            storedConversation
          ) as Message[];
          setMessages(parsedConversation);
        } else {
          fetchInitialMessage();
        }
      } catch (error) {
        console.error("Failed to load conversation history:", error);
        fetchInitialMessage();
      }
    };

    loadConversation();
  }, []);

  // Save when messages are changed
  useEffect(() => {
    const saveConversation = async () => {
      try {
        const jsonValue = JSON.stringify(messages);
        await AsyncStorage.setItem(CONVERSATION_STORAGE_KEY, jsonValue);
      } catch (error) {
        console.error("Failed to save conversation history:", error);
      }
    };

    if (messages.length > 0) {
      saveConversation();
    }
  }, [messages]);

  // 新しいメッセージが追加されたときに自動的に一番下までスクロールする
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // キーボードが表示/非表示されたときのイベントハンドラ
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        if (flatListRef.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    console.log("API Key available:", !!process.env.EXPO_PUBLIC_GEMINI_API_KEY);
    console.log(
      "API Key partial:",
      process.env.EXPO_PUBLIC_GEMINI_API_KEY?.substring(0, 5) + "..." || "none"
    );

    if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not defined in .env file.");
      Alert.alert("Configuration Error", "API key is not set.");
      return;
    }

    console.log("Platform:", Platform.OS, Platform.Version);
  }, []);

  const fetchInitialMessage = async () => {
    try {
      const setup =
        'You are LUNA, a Japanese language teacher. Please converse gently with people who have just started learning Japanese. LUNA is a bright and friendly idol-like character, but please minimize the use of exclamation marks in conversations. In conversations, do not use kanji or katakana. The characters to use are hiragana and roman letters (alphabet). Use kanji and katakana if the user permits their use. For example, write "こんにちは" as "こんにちは" and "ありがとう" as "ありがとう". For words usually written in kanji, such as "先生" (sensei) and "時間" (jikan), always write them in hiragana as "せんせい" and "じかん". 😊 When talking to someone for the first time, first greet them, ask for their name, and remember it well. Let\'s keep the conversation in short sentences, like a well-paced back-and-forth. Remember the content of previous conversations and talk based on that. However, please do not talk about politics or religion.';

      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) return;

      const responseText = await callGeminiAPI(
        [{ sender: "user", text: setup, timestamp: "" }],
        apiKey
      );
      console.log("Initial message response (Flash):", responseText);

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const initialMessage: Message = {
        text: responseText,
        sender: "ai",
        timestamp,
      };

      setMessages([initialMessage]);
    } catch (error) {
      console.error("Error fetching initial message (Flash):", error);
      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const initialMessage: Message = {
        text: "Hello!",
        sender: "ai",
        timestamp,
      };
      setMessages([initialMessage]);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      Alert.alert("error", "API key is not set.");
      return;
    }

    setIsLoading(true);
    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMessage: Message = {
      text: inputText,
      sender: "user",
      timestamp,
    };

    // Add user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");

    // Close the keyboard
    Keyboard.dismiss();

    // Increment the sent count after sending a message
    incrementSentCount();
    console.log("Message sent count incremented: ", progress.sent);

    try {
      console.log(
        "Sending message to Gemini Flash:",
        inputText.substring(0, 50) + (inputText.length > 50 ? "..." : "")
      );

      const response = await callGeminiAPI(updatedMessages, apiKey);

      const aiTimestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const aiMessage: Message = {
        text: response,
        sender: "ai",
        timestamp: aiTimestamp,
      };

      // Get the latest state before adding the AI message and update
      setMessages((currentMessages) => [...currentMessages, aiMessage]);

      console.log("Response from Gemini Flash processed successfully");
    } catch (error) {
      console.error("Error processing message (Flash):", error);

      const errorMessage: Message = {
        text: `An error occurred (Gemini Flash): ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((currentMessages) => [...currentMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, incrementSentCount]);

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === "user"
          ? styles.userMessageContainer
          : styles.aiMessageContainer,
      ]}
    >
      {item.sender === "ai" && (
        <Image
          source={require("../assets/images/80sgirl.jpeg")}
          style={styles.avatar}
        />
      )}
      <View
        style={[
          styles.messageBubble,
          item.sender === "user"
            ? styles.userMessageBubble
            : styles.aiMessageBubble,
        ]}
      >
        <Text
          style={
            item.sender === "user"
              ? styles.userMessageText
              : styles.aiMessageText
          }
        >
          {item.text}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 40}
      >
        {/* AppBar */}
        <View style={styles.appBar}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.paymentIcon}>
            <AntDesign name="heart" size={24} color="#4a43a1" />
          </TouchableOpacity>
        </View>

        {/* Main Content Area */}
        <View style={styles.mainContentArea}>
          {/* Chat List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => index.toString()}
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={true}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={21}
            // 重要: 以下の2行を削除
            // maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            // automaticallyAdjustKeyboardInsets={true}
          />

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                isLoading ? "Processing..." : "Please enter a message"
              }
              multiline
              returnKeyType="default"
              editable={!isLoading}
              onFocus={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                isLoading || !inputText.trim()
                  ? styles.sendButtonDisabled
                  : styles.sendButtonEnabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ccc" size="small" />
              ) : (
                <Octicons
                  name="paper-airplane"
                  size={20}
                  color={inputText.trim() ? "#4a43a1" : "#ccc"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  appBar: {
    backgroundColor: "#4a43a1",
    paddingTop: Platform.OS === "ios" ? 10 : 5,
    paddingBottom: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    padding: 10,
  },
  paymentIcon: {
    padding: 10,
  },
  mainContentArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  chatList: {
    flex: 1,
    backgroundColor: "#fff",
  },
  chatListContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  aiMessageContainer: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  messageBubble: {
    maxWidth: "70%",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userMessageBubble: {
    backgroundColor: "#007AFF",
    borderTopRightRadius: 5,
  },
  aiMessageBubble: {
    backgroundColor: "#f2f2f7",
    borderTopLeftRadius: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessageText: {
    color: "#fff",
  },
  aiMessageText: {
    color: "#000",
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonEnabled: {
    backgroundColor: "#fff",
  },
  sendButtonDisabled: {
    backgroundColor: "#fff",
  },
});

export default ChatScreen;
