import type { AISuggestion } from '../types';

export const mockAISuggestions: AISuggestion[] = [
  {
    id: 's1',
    chatId: 'c1',
    tone: 'Quyết đoán',
    text: 'Duyệt hotfix. Gửi PR link kèm kết quả test hồi quy trước 14h.',
  },
  {
    id: 's2',
    chatId: 'c1',
    tone: 'Cẩn trọng',
    text: 'Anh cần RCA ngắn gọn trước khi duyệt, em gửi sớm nhé.',
  },
  { id: 's3', chatId: 'c1', tone: 'Ngắn gọn', text: 'OK, anh review ngay.' },
  {
    id: 's4',
    chatId: 'c2',
    tone: 'Quy trình',
    text: 'Mở incident ticket SEC-214 và cập nhật timeline vào đó.',
  },
  {
    id: 's5',
    chatId: 'c2',
    tone: 'Chủ động',
    text: 'Gộp danh sách key cần rotate, anh sẽ duyệt từng cái.',
  },
  { id: 's6', chatId: 'c2', tone: 'Ngắn gọn', text: 'Đã rõ, báo anh khi xong.' },
  {
    id: 's7',
    chatId: 'c4',
    tone: 'Thân mật',
    text: 'Dạ con về mẹ ơi, mẹ nấu canh chua cá lóc nha!',
  },
  {
    id: 's8',
    chatId: 'c4',
    tone: 'Xin lỗi',
    text: 'Tuần này con kẹt deadline, tuần sau con về mẹ nhé.',
  },
  { id: 's9', chatId: 'c4', tone: 'Ngắn gọn', text: 'Dạ có ạ ❤️' },
  {
    id: 's10',
    chatId: 'default',
    tone: 'Xác nhận',
    text: 'Mình đã nhận được, sẽ phản hồi trong hôm nay.',
  },
  {
    id: 's11',
    chatId: 'default',
    tone: 'Hẹn lại',
    text: 'Hiện mình đang bận, 16h mình gọi lại được không?',
  },
  {
    id: 's12',
    chatId: 'default',
    tone: 'Cảm ơn',
    text: 'Cảm ơn bạn nhiều, mình sẽ kiểm tra ngay.',
  },
];