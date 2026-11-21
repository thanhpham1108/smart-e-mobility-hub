# Hướng dẫn triển khai Smart E-Mobility Hub

**Bắt đầu ở đây trên nhánh `develop`.** Nhóm làm một web app bằng HTML, CSS và JavaScript thuần. JSON cung cấp dữ liệu mẫu, còn `localStorage` giữ thay đổi trong trình duyệt demo. Dùng hai portal Student và Operator trong cùng một tab. So giao diện PC với mẫu đã chốt trước khi làm phần mobile.

## 1. Đọc gì trước khi code

1. Xem tên bạn và các module cần ghép trong [bảng phân công](docs/implementation/README.md#2-member-assignments-and-definition-of-done), rồi chọn đúng [luồng cần bàn giao đầu tiên](docs/implementation/README.md#first-handoff-for-each-member).
2. Dùng [Shared Contracts](docs/implementation/SHARED_CONTRACTS.md) để biết ID, trạng thái, timestamp, cách ghi dữ liệu và đầu vào/đầu ra giữa các module. Đây là quy ước dùng cho bản Final chạy trên trình duyệt.
3. Dùng [UI Design System](docs/implementation/UI_DESIGN_SYSTEM.md) và [hai mẫu PC](docs/implementation/ui-reference/README.md) cho giao diện. Đọc [method design](docs/submission-3/method-design/README.md) và [test cases](docs/submission-3/test-cases/README.md) của module để biết cách xử lý và kiểm tra từng thao tác.

**Phân công phần chung.** Thành (Member 5) phụ trách kho dữ liệu dùng chung, fixture, đồng hồ demo và reset. Các phần này đã chạy trong skeleton. Thành cũng phụ trách Smart Charging, ghép PR vào `develop` và tổng hợp Final. Duy (Member 1) phụ trách Hub & Identity, gồm tài khoản demo, nhận diện vai trò, Hub lookup và phần router liên quan đến vai trò. Mỗi member triển khai và sửa lỗi module của mình.

## 2. Tạo branch và chạy app

Từ thư mục repo, cập nhật thông tin remote rồi tạo branch từ `origin/develop`. Ví dụ với Smart Charging, đổi `smart-charging` thành tên module của bạn.

```sh
git fetch origin
git switch -c feature/smart-charging origin/develop
python3 -m http.server 4173
```

Mở [Student](http://localhost:4173/#/student/parking) hoặc [Operator](http://localhost:4173/#/operator/network). Trong Operator, **+15 min** tăng đồng hồ demo. **Reset Demo** ở cả hai portal đưa dữ liệu và giờ về mốc ban đầu. Hai trang hiện là màn hình tham chiếu dùng chung kho dữ liệu. Các route còn lại đang chờ member gắn màn hình.

Nếu đã có branch riêng, chuyển vào branch đó thay cho lệnh `git switch -c`. Khi có thay đổi chung trên `develop`, commit phần đang làm, rồi chạy `git fetch origin` và `git merge origin/develop` từ branch của bạn.

## 3. Code vào đâu và theo cách nào

| Vị trí | Cách dùng |
| --- | --- |
| `index.html`, `src/app/` | Điểm vào, router và store chung. Báo Thành khi cần sửa phần này để tránh nhiều PR cùng đổi một chỗ. |
| `src/ui/student/pages/`, `src/ui/operator/pages/` | Thêm nội dung route vào shell hiện có. Mỗi trang xuất `mount(root, context)` và trả hàm dọn listener hoặc timer đã tạo. |
| `src/ui/shared/` | Dùng lại thành phần, CSS và token hiện có. Đặt CSS riêng dưới class của trang để giữ các màn hình khác ổn định. |
| `src/modules/<tên-module>/` | Thêm logic nghiệp vụ của module tại đây. Dùng tên thư mục dạng `vehicle-rental`, `parking-private-ev` hoặc `smart-charging`. |
| [`src/data/fixtures/demo.json`](src/data/fixtures/demo.json) | Thêm dữ liệu mẫu của module vào đây, dùng ID theo quy ước. Sau khi chỉnh dữ liệu, tải lại app rồi bấm Reset Demo. |

Khi gắn màn hình, import hàm `mount` vào [router.js](src/app/router.js) và thêm `mount` vào route đã dành cho module của bạn. Hàm nhận `{ store, clock }` qua `context`. Xem [ví dụ gọi store](docs/implementation/SHARED_CONTRACTS.md#using-the-foundation) khi nối service.

- **UI gọi service, service lưu qua store.** Ví dụ nút Reserve gọi Rental kiểm tra và giữ xe, sau đó trang hiển thị kết quả đã lưu. Mỗi module dùng hàm của module sở hữu dữ liệu khi cần thay đổi liên module.
- **Dùng `import` và `export` với đường dẫn tương đối, gồm đuôi `.js`.** Dùng `camelCase` cho biến và hàm, tên file theo kiểu `kebab-case`, và căn 2 dấu cách như skeleton. Giữ nguyên cách viết trạng thái theo module sở hữu. Khi hiển thị nội dung người dùng nhập, dùng `textContent` hoặc `escapeHtml` từ component chung.
- **Dùng ID và thời gian chung.** Dùng đúng `hubId`, mã booking và timestamp theo Shared Contracts. Khi đối chiếu thời gian, lấy từ đồng hồ demo. Khi dữ liệu đã lưu xong, cả hai portal đọc từ cùng store.
- **Thay đổi có ý nghĩa, commit riêng theo luồng.** Kiểm tra `git status` và `git diff` trước khi stage. Dùng tài khoản và dữ liệu giả lập cho app. Giữ khóa API, mật khẩu thật và dữ liệu cá nhân ngoài repo.

## 4. Bàn giao và ghép PR

Khi có một thao tác chạy được, commit trên branch của bạn, chạy `git push -u origin HEAD`, rồi mở PR trên GitHub với nhánh đích **`develop`**. Mỗi PR cần người cùng nhóm kiểm tra. Nếu luồng đi qua hai module, hai owner thử cùng nhau. Thành ghép các PR đã qua kiểm tra. Nhánh `main` dùng cho bản demo ổn định.

Copy mẫu sau vào mô tả PR.

```text
Module và luồng:
Route hoặc màn hình:
Dữ liệu bắt đầu hoặc cách reset:
Các bước bấm để kiểm tra:
Kết quả và trạng thái dự kiến:
Module hoặc PR liên quan (nếu có):
Ảnh giao diện PC (nếu có thay đổi UI):
```

Test thủ công theo test case của module và ghi lại kết quả trong PR. Tối thiểu, thử luồng chính và một trường hợp lỗi quan trọng. Nếu PR có ghi dữ liệu, tải lại trang để kiểm tra trạng thái vừa lưu. Nếu dùng hai portal, kiểm tra cả hai hiển thị cùng một bản ghi. Sau khi ghép, chạy lại từ dữ liệu reset trên `develop`.

Ví dụ, PR đầu tiên của Parking và Charging có thể bàn giao luồng Student gửi yêu cầu hợp lệ khi Hub đầy, màn Student báo `Waiting #1` và màn Operator thấy đúng mã request đó. Sự kiện cổng trống có thể ghép trong PR tiếp theo.

## 5. Bàn giao cho Final

Mỗi người gửi Thành các bước demo, ảnh hoặc kết quả kiểm tra đã xác nhận và ghi chú AI đã hỗ trợ phần nào. Ngày nộp PDF, ngày trình bày và số phút demo đang chờ công bố. Dùng [các mốc tương đối và kịch bản demo](docs/implementation/README.md#5-countdown-to-the-classroom-presentation) để chuẩn bị.
