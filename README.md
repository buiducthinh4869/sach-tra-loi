# Sách Trả Lời

Nghĩ thầm một câu hỏi, chọn một chương, rồi giữ bìa sách để mở ra một trang bất kỳ. Câu trả lời của bạn nằm ở trang đó.

## Tính năng

- 8 chương: sáu chương chủ đề, mỗi chương khoảng 7.000 trang, cùng chương Tổng hợp và chương Ẩm thực:

  | Chương | Số trang |
  | --- | ---: |
  | Tình duyên | 7.038 |
  | Sự nghiệp | 6.930 |
  | Học hành | 7.054 |
  | Bạn bè & Gia đình | 6.979 |
  | Tiền bạc | 6.903 |
  | Bản thân | 6.978 |
  | Tổng hợp | 4.236 |
  | Ẩm thực | 1.118 món |

- Để sách tự đoán chương cho bạn
- Trang của hôm nay
- Tiếng lật trang
- Lịch sử lưu ngay trên trình duyệt

## Chương Ẩm thực

Chương dành cho câu hỏi "Hôm nay ăn gì?". Mỗi trang là một món ăn có thật, kèm tên gốc, nền ẩm thực, vùng và một dòng mô tả. Mỗi món luôn nằm ở cùng một số trang.

| Nền ẩm thực | Số món |
| --- | ---: |
| Việt Nam (Bắc 109, Trung 93, Nam 117, cơm nhà khắp ba miền 7) | 326 |
| Trung Hoa | 105 |
| Nhật Bản | 90 |
| Hàn Quốc | 86 |
| Thái Lan | 66 |
| Đông Nam Á khác | 81 |
| Ấn Độ và Nam Á | 56 |
| Trung Đông và Bắc Phi | 54 |
| Châu Âu | 161 |
| Châu Mỹ | 93 |
| **Tổng** | **1.118** |

Cách dùng bộ lọc (hiện ra khi chọn chương Ẩm thực, hoặc khi sách đoán câu hỏi thuộc chương này):

- **Ẩm thực**: "Bất kỳ" hoặc chọn một hay nhiều nền ẩm thực cùng lúc. Bấm lại để bỏ chọn.
- **Bữa**: "Theo giờ hiện tại" tự chọn bữa theo đồng hồ (5h đến 10h sáng, 10h đến 14h trưa, 14h đến 17h ăn vặt, 17h đến 22h tối, còn lại khuya). Hoặc chọn Sáng, Trưa, Tối, Khuya, Ăn vặt (gồm cả đồ uống), Tráng miệng.
- Nếu không món nào hợp bộ lọc, sách bỏ điều kiện bữa trước, rồi mới bỏ điều kiện ẩm thực, và ghi chú ngay trên trang.
- "Trang của hôm nay" cho một món cố định trong ngày theo bộ lọc đang chọn. Lựa chọn được nhớ trên trình duyệt.
- Gõ câu hỏi có "ăn gì", "đói", "quán", "lẩu", "thèm"... thì "Để sách đoán" sẽ mở chương này.

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

## Thêm món ăn

Mọi món nằm trong `dishes.js`, mỗi món một dòng:

```js
{ten: "Phở bò", goc: "", am_thuc: "viet", vung: "Hà Nội", bua: ["sang", "trua", "toi"], loai: "nuoc", mo_ta: "Nước dùng xương ninh trong, bánh phở mềm, thêm chút quẩy là đủ ấm bụng."},
```

- `ten`: tên người Việt quen gọi. `goc`: tên gốc hoặc phiên âm, như `"김치찌개 · Kimchi jjigae"`; để `""` nếu giống `ten`.
- `am_thuc`: `viet`, `trung`, `nhat`, `han`, `thai`, `dna`, `an`, `trungdong`, `au`, `my`.
- `bua`: một hay nhiều trong `sang`, `trua`, `toi`, `khuya`.
- `loai`: `nuoc` (món nước), `kho` (món khô, cơm), `nuong` (nướng, lẩu), `anvat`, `trangmieng`, `douong`.
- `mo_ta`: 12 đến 25 từ, kết thúc bằng dấu chấm, đúng với món thật.

Thêm hoặc bớt món sẽ làm số trang của các món thay đổi. Sửa xong chạy `node scripts/check.js`. Script đếm món theo nền ẩm thực, bữa và loại, báo nhóm chưa đủ số tối thiểu, món trùng tên, trường thiếu, mã sai và mô tả quá dài.

---

*Trò chơi cho vui, không phải lời khuyên.*
