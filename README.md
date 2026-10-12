# Sách Trả Lời

Nghĩ thầm một câu hỏi, chọn một chương, rồi giữ bìa sách để mở ra một trang bất kỳ. Câu trả lời của bạn nằm ở trang đó.

## Tính năng

- 7 chương, mỗi chương chủ đề có khoảng 7.000 trang:

  | Chương | Số trang |
  | --- | ---: |
  | Tình duyên | 7.038 |
  | Sự nghiệp | 6.930 |
  | Học hành | 7.054 |
  | Bạn bè & Gia đình | 6.979 |
  | Tiền bạc | 6.903 |
  | Bản thân | 6.978 |
  | Tổng hợp | 4.236 |

- Để sách tự đoán chương cho bạn
- Trang của hôm nay
- Tiếng lật trang
- Lịch sử lưu ngay trên trình duyệt

## Chơi ngay

https://buiducthinh4869.github.io/sach-tra-loi/

## Thêm câu trả lời

Mọi câu trả lời nằm trong `answers.js`, mỗi câu một dòng:

- `BANK.<chương>.solo`: câu trọn vẹn của chương (tối đa 30 từ).
- `BANK.<chương>.advice`: lời khuyên dạng hành động, sẽ được ghép sau mỗi câu phán (tối đa 20 từ).
- `VERDICTS`: câu phán ngắn dùng chung, như "Có, nhưng đừng vội." (tối đa 6 từ).
- `GENERAL`: câu riêng của chương Tổng hợp (tối đa 30 từ). Chương này còn gồm mọi câu solo của các chương khác.
- `GRUMPY`: câu sách nói khi bị hỏi cùng một câu đến lần thứ ba.

Mỗi trang luôn giữ cố định một câu, nên thêm hoặc bớt câu sẽ làm thứ tự các trang thay đổi.

Sửa xong, chạy kiểm tra (cần Node.js):

```
node scripts/check.js
```

Script đếm số câu và số trang từng chương, báo câu trùng hoặc gần trùng, câu quá dài, câu thiếu dấu chấm cuối câu và ký tự lạ. Chỉ commit khi script báo "Sạch: không có lỗi."

---

*Trò chơi cho vui, không phải lời khuyên.*
