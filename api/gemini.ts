import { Message } from '../types/message';

export async function callGeminiAPI(messages: Message[], apiKey: string) {
  try {
    const apiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    console.log('Making direct API call to Gemini Flash with updated endpoint');
    // console.log('Conversation history:', messages);

    const promptContent = messages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const requestData = {
      contents: promptContent,
    };

    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response (Flash):', errorText);
      throw new Error(`API返答エラー (Flash): ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response received (Flash)');

    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0]
    ) {
      return data.candidates[0].content.parts[0].text;
    } else {
      console.error(
        'Unexpected API response structure (Flash):',
        JSON.stringify(data)
      );
      throw new Error('APIレスポンスの形式が不正です (Flash)');
    }
  } catch (error) {
    console.error('Direct API call error (Flash):', error);
    throw error;
  }
}