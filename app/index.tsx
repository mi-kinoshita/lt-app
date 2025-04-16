// index.tsx
import React, { useState, useRef, useCallback, useEffect } from "react"; // useEffectを追加
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Linking,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { FontAwesome, Ionicons, AntDesign, Feather } from "@expo/vector-icons";
import { useProgressData } from "../hooks/useProgressData";
import { DrawerLayout } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";

interface IngredientProps {
  name: string;
  value: string;
  percentage: string;
  color: string;
}

const IngredientPill = ({
  name,
  value,
  percentage,
  color,
}: IngredientProps) => {
  let icon;
  switch (name) {
    case "Point":
      icon = (
        <FontAwesome name="star" size={20} color={color} style={styles.icon} />
      );
      break;
    case "Streak":
      icon = (
        <Ionicons
          name="flame-outline"
          size={20}
          color={color}
          style={styles.icon}
        />
      );
      break;
    case "Time":
      icon = (
        <AntDesign
          name="clockcircleo"
          size={20}
          color={color}
          style={styles.icon}
        />
      );
      break;
    case "Sent":
      icon = (
        <Feather name="send" size={20} color={color} style={styles.icon} />
      );
      break;
    default:
      icon = null;
      break;
  }

  const numericValue = value.replace(/[^0-9]/g, "");
  const numericPercentage = Number(percentage);
  let backgroundColor = color; // Default color

  // Logic to change background color according to percentage
  if (numericPercentage > 75) {
    backgroundColor = color; // Original color if high
  } else if (numericPercentage > 50) {
    backgroundColor = lightenColor(color, 0.2); // Slightly lighter if higher than intermediate
  } else {
    backgroundColor = lightenColor(color, 0.5); // Even lighter if low
  }

  // Helper function to lighten color (adjust as needed)
  function lightenColor(col: string, amt: number) {
    let usePound = false;
    if (col[0] === "#") {
      col = col.slice(1);
      usePound = true;
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255;
    else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00ff) + amt;
    if (b > 255) b = 255;
    else if (b < 0) b = 0;
    let g = (num & 0x0000ff) + amt;
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
    return (
      (usePound ? "#" : " ") +
      (g | (b << 8) | (r << 16)).toString(16).padStart(6, "0")
    );
  }

  return (
    <View style={styles.ingredientPill}>
      {icon}
      <View style={styles.percentageContainer}>
        <View
          style={[
            styles.percentageFill,
            {
              backgroundColor: backgroundColor,
              width: `${numericPercentage}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.ingredientValue}>{numericValue}</Text>
      <Text style={styles.ingredientName}>{name}</Text>
    </View>
  );
};

// DrawerMenuItem component (for common use)
const DrawerMenuItem = ({
  icon,
  text,
  onPress,
  textColor,
}: {
  icon: JSX.Element;
  text: string;
  onPress: () => void;
  textColor?: string;
}) => (
  <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
    {icon}
    <Text style={[styles.drawerItemText, textColor && { color: textColor }]}>
      {text}
    </Text>
  </TouchableOpacity>
);

export default function IndexScreen() {
  const router = useRouter();
  const { progress, loadProgress } = useProgressData();
  const drawer = useRef<DrawerLayout>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 初回読み込み時に状態を更新
  useEffect(() => {
    if (isInitialLoad) {
      loadProgress();
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, loadProgress]);

  // 画面がフォーカスされるたびにデータを再読み込み
  useFocusEffect(
    useCallback(() => {
      console.log("IndexScreen was focused. Loading progress data.");
      loadProgress();

      return () => {
        console.log("IndexScreen lost focus.");
      };
    }, [loadProgress])
  );

  const handleLessonStart = () => {
    router.push("/chatScreen");
  };

  const formatTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hours ${minutes} minutes`;
  };

  const calculatePercentage = (
    currentValue: number,
    maxValue: number
  ): string => {
    if (maxValue === 0) return "0";
    return ((currentValue / maxValue) * 100).toFixed(0);
  };

  const targetPoints = 2000;
  const targetStreak = 30;
  const targetTime = 300; // minutes
  const targetMessages = 500;

  const renderDrawer = () => (
    <SafeAreaView style={styles.drawerContainer}>
      <View style={styles.drawerHeader}>
        <Image
          source={require("../assets/images/wakuwaku.png")}
          style={styles.drawerHeaderImage}
          resizeMode="contain"
        />
      </View>

      <ScrollView style={{ flex: 1 }}>
        <DrawerMenuItem
          icon={<Ionicons name="mail-outline" size={20} color="#333" />}
          text="Contact us"
          onPress={() =>
            Linking.openURL(
              "https://docs.google.com/forms/d/e/1FAIpQLSdIiaBK_bxLC4ls5-nnp6CMLaz3-3dTNC62WohrQVHmdO9FMg/viewform?usp=dialog"
            )
          }
        />
        <DrawerMenuItem
          icon={<AntDesign name="youtube" size={20} color="#333" />}
          text="Find us on Youtube"
          onPress={() =>
            Linking.openURL("https://www.youtube.com/@aituber_luna")
          }
        />
      </ScrollView>

      <View style={styles.drawerFooter}>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              "https://www.freeprivacypolicy.com/live/f90c33d9-5721-4d67-ad51-614a93f0127b"
            )
          }
        >
          <Text style={styles.drawerFooterLink}>Terms and Conditions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              "https://www.freeprivacypolicy.com/live/5d8f70fa-81bc-4467-8899-14ec37bc190d"
            )
          }
        >
          <Text style={styles.drawerFooterLink}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // 数値変換のためのヘルパー関数
  const extractNumericValue = (value: string | number): number => {
    if (typeof value === "number") return value;
    return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
  };

  return (
    <DrawerLayout
      ref={drawer}
      drawerWidth={300}
      drawerPosition="left"
      renderNavigationView={renderDrawer}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => drawer.current?.openDrawer()}
              style={styles.menuIcon}
            >
              <Ionicons name="menu-outline" size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.paymentIcon}>
              <AntDesign name="heart" size={24} color="#4a43a1" />
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.imageContainer}>
              <Image
                source={require("../assets/images/80sgirl.jpeg")}
                resizeMode="contain"
                style={styles.mainImage}
                defaultSource={require("../assets/images/80sgirl.jpeg")}
              />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Progress</Text>
              <View style={styles.ingredientsRow}>
                <IngredientPill
                  name="Point"
                  value={progress.points.toString()}
                  percentage={calculatePercentage(
                    progress.points,
                    targetPoints
                  )}
                  color="#FFD700"
                />
                <IngredientPill
                  name="Streak"
                  value={progress.streak.toString()}
                  percentage={calculatePercentage(
                    progress.streak,
                    targetStreak
                  )}
                  color="#f55862"
                />
                <IngredientPill
                  name="Time"
                  value={progress.time}
                  percentage={calculatePercentage(
                    extractNumericValue(progress.time),
                    targetTime
                  )}
                  color="#fe9b4f"
                />
                <IngredientPill
                  name="Sent"
                  value={progress.sent.toString()}
                  percentage={calculatePercentage(
                    progress.sent,
                    targetMessages
                  )}
                  color="#1ac7af"
                />
              </View>
              <View style={styles.sectionDetail}>
                <TouchableOpacity
                  style={[styles.addButton, { pointerEvents: "auto" }]}
                  onPress={handleLessonStart}
                >
                  <Text style={styles.addButtonText}>LET'S TALK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DrawerLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: "#4a43a1",
  },

  scrollContainer: {
    paddingBottom: 0,
  },

  header: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between", // アイコンを左右に配置

    paddingHorizontal: 20,

    paddingTop: 20,

    paddingBottom: 10,
  },

  backButton: {
    padding: 5,
  },

  headerTitle: {
    // 不要になったため削除

    flex: 1,

    fontSize: 22,

    fontWeight: "600",

    textAlign: "center",

    marginRight: 30,
  },

  contentContainer: {
    flexDirection: "column",
  },

  imageContainer: {
    backgroundColor: "#4a43a1",

    justifyContent: "center",
  },

  mainImage: {
    width: "100%",

    height: 300,

    borderRadius: 20,

    alignSelf: "center",
  },

  section: {
    backgroundColor: "white",

    borderTopLeftRadius: 40,

    borderTopRightRadius: 40,

    borderBottomLeftRadius: 0,

    borderBottomRightRadius: 0,

    paddingVertical: 30,

    paddingHorizontal: 20,

    paddingTop: 30,

    paddingLeft: 30,

    paddingBottom: 50,

    marginBottom: 0,

    marginTop: 0,

    minHeight: "100%",
  },

  sectionTitle: {
    fontSize: 24,

    fontWeight: "700",

    marginBottom: 35,

    paddingTop: 5,

    paddingLeft: 15,
  },

  sectionDetail: {
    marginTop: 70,
  },

  ingredientsRow: {
    flexDirection: "row",

    justifyContent: "space-between",
  },

  ingredientPill: {
    alignItems: "center",

    width: 80,
  },

  icon: {
    marginBottom: 10,
  },

  ingredientName: {
    fontSize: 12,

    textAlign: "center",
  },

  ingredientValue: {
    fontSize: 16,

    fontWeight: "bold",

    textAlign: "center",

    marginVertical: 2,
  },

  percentageContainer: {
    width: 45,

    height: 5,

    borderRadius: 5,

    backgroundColor: "#ddd",

    overflow: "hidden",

    marginBottom: 5,
  },

  percentageFill: {
    width: "100%",

    borderRadius: 5,

    height: "100%",

    minHeight: 2,
  },

  percentageText: {
    fontSize: 10,

    fontWeight: "600",

    marginTop: 2,

    textAlign: "center",
  },

  addButton: {
    backgroundColor: "#4a43a1",

    paddingVertical: 15,

    paddingHorizontal: 20,

    borderRadius: 8,
  },

  addButtonText: {
    textAlign: "center",

    fontSize: 16,

    fontWeight: "700",

    color: "white",
  },

  menuIcon: {
    padding: 10,
  },

  paymentIcon: {
    padding: 10,
  },

  drawerContainer: {
    flex: 1,

    paddingTop: 60, // ステータスバーの高さなどを考慮して調整

    backgroundColor: "#fff",

    justifyContent: "flex-end", // ヘッダー、コンテンツ、フッターを適切に配置
  },

  drawerHeader: {
    paddingHorizontal: 20,

    paddingTop: 30,

    paddingBottom: 20,

    flexDirection: "column", // 縦方向に要素を並べる

    alignItems: "center", // 中央揃え
  },

  drawerHeaderImage: {
    backgroundColor: "#a7a2eb",

    width: 150, // 画像の幅を調整

    height: 150, // 画像の高さを調整

    borderRadius: 75, // 必要であれば丸くする

    marginBottom: 10, // テキストとの間隔
  },

  drawerItem: {
    paddingVertical: 15,

    paddingHorizontal: 30,

    flexDirection: "row",

    alignItems: "center",
  },

  drawerItemText: {
    fontSize: 16,

    color: "#333",

    marginLeft: 15,
  },

  drawerFooter: {
    paddingHorizontal: 20,

    paddingBottom: 20,

    paddingTop: 10,

    flexDirection: "row",

    justifyContent: "space-between",
  },

  drawerFooterLink: {
    fontSize: 14,

    color: "#ccc",
  },
});
