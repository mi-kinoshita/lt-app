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
} from "react-native";
import Constants from "expo-constants";
import Octicons from "@expo/vector-icons/Octicons";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callGeminiAPI } from "../api/gemini";
import { Message } from "../types/message";
import { useProgressData } from "../hooks/useProgressData";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { scenarios } from "./constants/scenarios";
import { useFocusEffect } from "@react-navigation/native";

const CONVERSATION_STORAGE_KEY_PREFIX = "chatConversation_";
const CONVERSATION_SUMMARIES_KEY = "_conversationSummaries_";
const USER_SETTINGS_KEY = "userSettings";
const SURVEY_ANSWERS_KEY = "surveyAnswers";
const TODAY_CHAT_TIME_KEY_PREFIX = "todayChatTime_";

interface ConversationSummary {
  id: string;
  participantName: string;
  lastMessage: string;
  timestamp: string;
  avatarUrl?: string;
  initialPrompt?: string;
  icon?: string;
  text?: string;
}

interface UserSettings {
  profileImageUri: string | null;
  username: string | null;
}

interface SurveyAnswers {
  q1?: string;
  q2?: string[];
  q3?: string;
  username?: string;
  [key: string]: any;
}

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { progress } = useProgressData();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("Chat");

  const params = useLocalSearchParams();
  const initialPrompt = params.initialPrompt as string | undefined;
  const routeConversationId = params.conversationId as string | undefined;

  const [chatStartTime, setChatStartTime] = useState<number | null>(null);
  const accumulatedDailyChatTimeRef = useRef<number>(0);
  const currentDayRef = useRef<string | null>(null);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const day = today.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useFocusEffect(
    useCallback(() => {
      const today = getTodayDateString();
      currentDayRef.current = today;

      const loadTodayTime = async () => {
        try {
          const savedTime = await AsyncStorage.getItem(
            `${TODAY_CHAT_TIME_KEY_PREFIX}${today}`
          );
          if (savedTime) {
            accumulatedDailyChatTimeRef.current = parseInt(savedTime, 10);
            console.log(
              "Loaded today's accumulated chat time:",
              accumulatedDailyChatTimeRef.current,
              "ms"
            );
          } else {
            accumulatedDailyChatTimeRef.current = 0;
            console.log("No saved chat time for today. Starting from 0.");
          }
        } catch (error) {
          console.error("Failed to load today's chat time:", error);
          accumulatedDailyChatTimeRef.current = 0;
        } finally {
          setChatStartTime(Date.now());
          console.log("Chat screen focused. Timer started.");
        }
      };

      loadTodayTime();

      return () => {
        if (chatStartTime !== null) {
          const endTime = Date.now();
          const sessionDuration = endTime - chatStartTime;

          accumulatedDailyChatTimeRef.current += sessionDuration;

          const saveTodayTime = async () => {
            try {
              const dayToSaveUnder = currentDayRef.current;

              if (dayToSaveUnder) {
                await AsyncStorage.setItem(
                  `${TODAY_CHAT_TIME_KEY_PREFIX}${dayToSaveUnder}`,
                  accumulatedDailyChatTimeRef.current.toString()
                );
                console.log(
                  `Chat screen blurred. Saved accumulated chat time for ${dayToSaveUnder}:`,
                  accumulatedDailyChatTimeRef.current,
                  "ms"
                );
              } else {
                console.warn(
                  "currentDayRef is null on blur, cannot save chat time."
                );
              }
            } catch (error) {
              console.error("Failed to save today's chat time:", error);
            }
          };
          saveTodayTime();

          setChatStartTime(null);
          currentDayRef.current = null;
          console.log(
            "Chat screen blurred. Timer stopped. Session duration:",
            sessionDuration,
            "ms"
          );
        } else {
          console.log("Chat screen blurred, but timer was not started.");
        }
      };
    }, [])
  );

  useEffect(() => {
    const loadOrCreateConversation = async () => {
      if (initialPrompt) {
        const newId = uuidv4();
        setConversationId(newId);

        const selectedScenario = scenarios.find(
          (s) => s.prompt === initialPrompt
        );
        const participantName = selectedScenario?.text || "Language AI";
        setChatTitle(participantName);

        const newSummary: ConversationSummary = {
          id: newId,
          participantName: participantName,
          lastMessage: "New conversation started...",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          avatarUrl: selectedScenario ? undefined : undefined,
          initialPrompt: initialPrompt,
          icon: selectedScenario?.icon,
          text: selectedScenario?.text,
        };
        await saveConversationSummary(newSummary);

        setMessages([]);
        fetchInitialMessage(initialPrompt, newId);
      } else if (routeConversationId) {
        setConversationId(routeConversationId);
        loadMessages(routeConversationId);
        const summary = await getConversationSummary(routeConversationId);
        if (summary) {
          setChatTitle(summary.participantName);
        } else {
          setChatTitle("Language AI");
        }
      } else {
        const defaultNewId = uuidv4();
        setConversationId(defaultNewId);
        const participantName = "Language AI";
        setChatTitle(participantName);

        const newSummary: ConversationSummary = {
          id: defaultNewId,
          participantName: participantName,
          lastMessage: "Welcome!",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          avatarUrl: undefined,
        };
        await saveConversationSummary(newSummary);
        setMessages([]);
        fetchInitialMessage("Hello!", defaultNewId);
      }
    };

    loadOrCreateConversation();
  }, [params.initialPrompt, params.conversationId]);

  const getConversationSummary = async (
    id: string
  ): Promise<ConversationSummary | undefined> => {
    try {
      const storedSummaries = await AsyncStorage.getItem(
        CONVERSATION_SUMMARIES_KEY
      );
      const summaries: ConversationSummary[] = storedSummaries
        ? JSON.parse(storedSummaries)
        : [];
      return summaries.find((s) => s.id === id);
    } catch (error) {
      console.error(`Failed to get conversation summary for ID: ${id}`, error);
      return undefined;
    }
  };

  const loadMessages = async (id: string) => {
    setIsLoading(true);
    try {
      const storedConversation = await AsyncStorage.getItem(
        `${CONVERSATION_STORAGE_KEY_PREFIX}${id}`
      );
      if (storedConversation) {
        const parsedConversation = JSON.parse(storedConversation) as Message[];
        setMessages(parsedConversation);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error(
        `Failed to load messages for conversation ID: ${id}`,
        error
      );
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessages = async (id: string, msgs: Message[]) => {
    try {
      const jsonValue = JSON.stringify(msgs);
      await AsyncStorage.setItem(
        `${CONVERSATION_STORAGE_KEY_PREFIX}${id}`,
        jsonValue
      );
    } catch (error) {
      console.error(
        `Failed to save messages for conversation ID: ${id}`,
        error
      );
    }
  };

  const saveConversationSummary = async (summary: ConversationSummary) => {
    try {
      const storedSummaries = await AsyncStorage.getItem(
        CONVERSATION_SUMMARIES_KEY
      );
      let summaries: ConversationSummary[] = storedSummaries
        ? JSON.parse(storedSummaries)
        : [];

      const existingIndex = summaries.findIndex((s) => s.id === summary.id);
      if (existingIndex > -1) {
        summaries[existingIndex] = summary;
      } else {
        summaries.unshift(summary);
      }

      await AsyncStorage.setItem(
        CONVERSATION_SUMMARIES_KEY,
        JSON.stringify(summaries)
      );
    } catch (error) {
      console.error(
        `Failed to save conversation summary for ID: ${summary.id}`,
        error
      );
    }
  };

  useEffect(() => {
    if (!isLoading && conversationId && messages.length > 0) {
      saveMessages(conversationId, messages);
      const lastMessage = messages[messages.length - 1];
      const updateSummaryWithExistingInfo = async () => {
        const existingSummary = await getConversationSummary(conversationId);

        const updatedSummary: ConversationSummary = {
          id: conversationId,
          participantName: existingSummary?.participantName || "Language AI",
          lastMessage: lastMessage.text,
          timestamp: lastMessage.timestamp,
          avatarUrl: existingSummary?.avatarUrl,
          initialPrompt: existingSummary?.initialPrompt,
          icon: existingSummary?.icon,
          text: existingSummary?.text,
        };
        await saveConversationSummary(updatedSummary);
      };
      updateSummaryWithExistingInfo();
    }
  }, [messages, isLoading, conversationId]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

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
    if (!process.env.EXPO_PUBLIC_GEMINI_API_KEY) {
      Alert.alert("Configuration Error", "API key is not set.");
      return;
    }
  }, []);

  const fetchInitialMessage = async (promptToSend: string, id: string) => {
    setIsLoading(true);
    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) return;

      const storedUserSettings = await AsyncStorage.getItem(USER_SETTINGS_KEY);
      let currentUsername: string | null = null;
      if (storedUserSettings) {
        const parsedSettings: UserSettings = JSON.parse(storedUserSettings);
        currentUsername = parsedSettings.username || null;
      }

      const storedSurveyAnswers = await AsyncStorage.getItem(
        SURVEY_ANSWERS_KEY
      );
      let currentCharacterLevel: string | null = null;
      if (storedSurveyAnswers) {
        const parsedAnswers: SurveyAnswers = JSON.parse(storedSurveyAnswers);
        currentCharacterLevel = parsedAnswers.q3 || null;
      }

      let baseSetup =
        'You are LUNA, a Japanese language teacher. Please converse gently with people who have just started learning Japanese. LUNA is a bright and friendly idol-like character, but please minimize the use of exclamation marks in conversations. In conversations, do not use kanji or katakana. The characters to use are hiragana and roman letters (alphabet). Use kanji and katakana if the user permits their use. For example, write "こんにちは" as "こんにちは" and "ありがとう" as "ありがとう". For words usually written in kanji, such as "先生" (sensei) and "時間" (jikan), always write them in hiragana as "せんせい" and "じかん". 😊 When talking to someone for the first first time, first greet them, ask for their name, and remember it well. Let\'s keep the conversation in short sentences, like a well-paced back-and-forth. Remember the content of previous conversations and talk based on that. However, please do not talk about politics or religion.';

      if (currentUsername) {
        baseSetup += ` The user's name is ${currentUsername}.`;
      }
      if (currentCharacterLevel) {
        baseSetup += ` Please converse with them using Japanese characters up to ${currentCharacterLevel}.`;

        if (
          currentCharacterLevel.includes("romaji") &&
          !currentCharacterLevel.includes("hiragana")
        ) {
          baseSetup += ` Output should primarily be in romaji.`;
        } else if (
          currentCharacterLevel.includes("hiragana") &&
          !currentCharacterLevel.includes("katakana")
        ) {
          baseSetup += ` Output should be in hiragana and romaji. Avoid katakana and kanji.`;
        } else if (
          currentCharacterLevel.includes("katakana") &&
          !currentCharacterLevel.includes("kanji")
        ) {
          baseSetup += ` Output can use hiragana, katakana, and romaji. Avoid kanji.`;
        } else if (currentCharacterLevel.includes("kanji")) {
          baseSetup += ` Output can use kanji, hiragana, katakana, and romaji as appropriate for a native speaker.`;
        }
      }

      const firstMessageText = promptToSend;

      const messagesForApi: Message[] = [
        { sender: "user", text: baseSetup, timestamp: "" },
      ];
      if (firstMessageText && firstMessageText !== baseSetup) {
        messagesForApi.push({
          sender: "user",
          text: firstMessageText,
          timestamp: "",
        });
      } else if (!firstMessageText) {
        messagesForApi.push({
          sender: "user",
          text: "Start the conversation.",
          timestamp: "",
        });
      }

      const responseText = await callGeminiAPI(messagesForApi, apiKey);

      const timestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const initialAiMessage: Message = {
        text: responseText,
        sender: "ai",
        timestamp,
      };

      setMessages([initialAiMessage]);

      if (id) {
        const existingSummary = await getConversationSummary(id);

        const updatedSummary: ConversationSummary = {
          id: id,
          participantName: existingSummary?.participantName || "Language AI",
          lastMessage: initialAiMessage.text,
          timestamp: timestamp,
          avatarUrl: existingSummary?.avatarUrl,
          initialPrompt: existingSummary?.initialPrompt,
          icon: existingSummary?.icon,
          text: existingSummary?.text,
        };
        await saveConversationSummary(updatedSummary);
      }
    } catch (error) {
      console.error("Error fetching initial message:", error);
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

      if (id) {
        const existingSummary = await getConversationSummary(id);

        const updatedSummary: ConversationSummary = {
          id: id,
          participantName: existingSummary?.participantName || "Language AI",
          lastMessage: initialMessage.text,
          timestamp: timestamp,
          avatarUrl: existingSummary?.avatarUrl,
          initialPrompt: existingSummary?.initialPrompt,
          icon: existingSummary?.icon,
          text: existingSummary?.text,
        };
        await saveConversationSummary(updatedSummary);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading || !conversationId) return;

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

    const messagesToSend = [...messages, userMessage];
    setMessages(messagesToSend);
    setInputText("");
    Keyboard.dismiss();

    try {
      const response = await callGeminiAPI(messagesToSend, apiKey);

      const aiTimestamp = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const aiMessage: Message = {
        text: response,
        sender: "ai",
        timestamp: aiTimestamp,
      };

      const finalMessages = [...messagesToSend, aiMessage];
      setMessages(finalMessages);

      if (conversationId) {
        const existingSummary = await getConversationSummary(conversationId);

        const updatedSummary: ConversationSummary = {
          id: conversationId,
          participantName: existingSummary?.participantName || "Language AI",
          lastMessage: aiMessage.text,
          timestamp: aiTimestamp,
          avatarUrl: existingSummary?.avatarUrl,
          initialPrompt: existingSummary?.initialPrompt,
          icon: existingSummary?.icon,
          text: existingSummary?.text,
        };
        await saveConversationSummary(updatedSummary);
      }
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

      const messagesWithError = [...messagesToSend, errorMessage];
      setMessages(messagesWithError);

      if (conversationId) {
        const existingSummary = await getConversationSummary(conversationId);

        const updatedSummary: ConversationSummary = {
          id: conversationId,
          participantName: existingSummary?.participantName || "Language AI",
          lastMessage: errorMessage.text,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          avatarUrl: existingSummary?.avatarUrl,
          initialPrompt: existingSummary?.initialPrompt,
          icon: existingSummary?.icon,
          text: existingSummary?.text,
        };
        await saveConversationSummary(updatedSummary);
      }
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, conversationId]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
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
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 40}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              router.replace("/(tabs)/chatListScreen");
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {chatTitle}
            </Text>
          </View>
          <View style={styles.headerRightPlaceholder}></View>
        </View>

        <View style={styles.mainContentArea}>
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
          />

          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                isLoading ? "Processing..." : "Please enter a message"
              }
              placeholderTextColor="#ccc"
              multiline
              returnKeyType="default"
              editable={!isLoading && !!conversationId}
              onFocus={() => {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                isLoading || !inputText.trim() || !conversationId
                  ? styles.sendButtonDisabled
                  : styles.sendButtonEnabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading || !conversationId}
            >
              {isLoading ? (
                <ActivityIndicator color="#ccc" size="small" />
              ) : (
                <Octicons
                  name="paper-airplane"
                  size={20}
                  color={
                    inputText.trim() && !!conversationId ? "#4a43a1" : "#ccc"
                  }
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
  mainContentArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    paddingRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  headerRightPlaceholder: {
    width: 24 + 10,
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
