import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiKey = process.env.GEMINI_API_KEY;
const client = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

function getAvailableMoves(board) {
  return board
    .map((value, index) => (value === null ? index : null))
    .filter((value) => value !== null);
}

export async function getAIMove(board) {
  const availableMoves = getAvailableMoves(board);
  if (!availableMoves.length) {
    return null;
  }

  if (!client) {
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a tic-tac-toe engine.\nReturn only JSON object like {"move":number}.\nBoard is array of 9 where null means empty, X is player, O is AI.\nChoose one valid move index from this list: ${JSON.stringify(availableMoves)}\nBoard: ${JSON.stringify(board)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (typeof parsed.move === "number" && availableMoves.includes(parsed.move)) {
      return parsed.move;
    }

    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  } catch (error) {
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }
}
