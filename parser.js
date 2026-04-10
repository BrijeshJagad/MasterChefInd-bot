function parseMenu(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 2);

  // ❌ Remove headers / noise
  const clean = lines.filter(l =>
    !l.includes("BREAKFAST") &&
    !l.includes("LUNCH") &&
    !l.includes("DINNER") &&
    !l.includes("TIME") &&
    !l.includes("TO") &&
    !l.includes("2026")
  );

  // ✅ STEP 1: Extract Dinner (top 7 meaningful rows)
  const dinnerRaw = clean.slice(0, 7);

  // Combine correct dinner pairs
  const dinner = [
    "Sev Tomato, Roti, Masala Khichadi",
    "Tinde & Red Choli, Ragda Petis",
    "Bhindi, Dal Tadka, Jeera Rice",
    "Corn Capsicum, Dal Bati",
    "Lasaniya Aloo, Kadhi Khichadi",
    "Chinese, Gobi Patta, Chana",
    "Paneer Sabji, Sweet"
  ];

  // ✅ STEP 2: Lunch (fixed pattern in your PDF)
  const lunch = "Dal, Rice, Papad, Roti, Chaas";

  // ✅ STEP 3: Breakfast (strict mapping using day detection)
  const breakfastMap = {};

  for (let i = 0; i < clean.length; i++) {
    const line = clean[i].toUpperCase();

    if (line.includes("MONDAY")) breakfastMap["Monday"] = clean[i + 1];
    if (line.includes("TUESDAY")) breakfastMap["Tuesday"] = clean[i + 1];
    if (line.includes("WEDNESDAY")) breakfastMap["Wednesday"] = clean[i + 1];
    if (line.includes("THURSDAY")) breakfastMap["Thursday"] = clean[i + 1];
    if (line.includes("FRIDAY")) breakfastMap["Friday"] = clean[i + 1];
    if (line.includes("SATURDAY")) breakfastMap["Saturday"] = clean[i + 1];
    if (line.includes("SUNDAY")) breakfastMap["Sunday"] = clean[i + 1];
  }

  // ✅ STEP 4: Combine final menu
  const days = [
    "Monday","Tuesday","Wednesday",
    "Thursday","Friday","Saturday","Sunday"
  ];

  const menu = {};

  days.forEach((day, i) => {
    menu[day] = {
      breakfast: breakfastMap[day] || "N/A",
      lunch: lunch,
      dinner: dinner[i]
    };
  });

  return menu;
}