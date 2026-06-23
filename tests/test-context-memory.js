#!/usr/bin/env node

/**
 * Test script để kiểm tra context memory của AI
 * Gửi 2 message liên tiếp: "tôi tên khánh" và "tôi tên gì?"
 * Xem AI có nhớ tên user không
 */

const API_URL = 'https://connect.tramai.tech/v1/chat/completions';
const API_KEY = 'sk-1624664f8df88e0d-ifbtn2-ac59b3b3';

async function testContextMemory() {
  console.log('🧪 Bắt đầu test context memory...\n');

  const messages = [
    {
      role: 'system',
      content: 'Bạn là một trợ lý AI hữu ích. Hãy trả lời bằng tiếng Việt.'
    }
  ];

  // Message 1: Giới thiệu tên
  messages.push({
    role: 'user',
    content: 'tôi tên khánh'
  });

  console.log('📤 Message 1 (User):', 'tôi tên khánh');

  try {
    const response1 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'tramai-go',
        messages: messages,
        temperature: 0.7
      })
    });

    const responseText1 = await response1.text();
    // Extract JSON object from response (handle potential trailing "data: [DONE]")
    const jsonMatch1 = responseText1.match(/\{[\s\S]*\}/);
    const data1 = jsonMatch1 ? JSON.parse(jsonMatch1[0]) : null;
    
    if (!data1 || data1.error) {
      console.error('❌ Lỗi ở message 1:', data1?.error || 'Không thể parse response');
      return;
    }

    const aiReply1 = data1.choices[0].message.content;
    messages.push({
      role: 'assistant',
      content: aiReply1
    });

    console.log('📥 Reply 1 (AI):', aiReply1);
    console.log('📊 Token usage:', data1.usage);
    console.log('---\n');

    // Message 2: Hỏi tên
    messages.push({
      role: 'user',
      content: 'tôi tên gì?'
    });

    console.log('📤 Message 2 (User):', 'tôi tên gì?');

    const response2 = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'tramai-go',
        messages: messages,
        temperature: 0.7
      })
    });

    const responseText2 = await response2.text();
    // Extract JSON object from response (handle potential trailing "data: [DONE]")
    const jsonMatch2 = responseText2.match(/\{[\s\S]*\}/);
    const data2 = jsonMatch2 ? JSON.parse(jsonMatch2[0]) : null;
    
    if (!data2 || data2.error) {
      console.error('❌ Lỗi ở message 2:', data2?.error || 'Không thể parse response');
      return;
    }

    const aiReply2 = data2.choices[0].message.content;
    console.log('📥 Reply 2 (AI):', aiReply2);
    console.log('📊 Token usage:', data2.usage);
    console.log('---\n');

    // Kiểm tra xem AI có nhớ tên không
    console.log('🧠 Kết quả kiểm tra context memory:');
    const hasName = aiReply2.toLowerCase().includes('khánh') || 
                    aiReply2.toLowerCase().includes('khanh');
    
    if (hasName) {
      console.log('✅ AI NHỚ tên bạn! (Nhắc đến "Khánh")');
    } else {
      console.log('❌ AI KHÔNG nhớ tên bạn hoặc không nhắc đến.');
    }

    console.log('\n✅ Test hoàn tất!');
    console.log(`📊 Tổng số messages trong context: ${messages.length}`);

  } catch (error) {
    console.error('❌ Lỗi khi gọi API:', error.message);
    if (error.cause) {
      console.error('  → Nguyên nhân:', error.cause);
    }
  }
}

// Chạy test
testContextMemory();