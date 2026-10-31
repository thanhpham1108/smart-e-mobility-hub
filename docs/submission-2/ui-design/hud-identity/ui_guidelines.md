# SMART E-MOBILITY HUB — UI DESIGN GUIDELINES & DESIGN SYSTEM
**Mục đích:** Quy định quy chuẩn chung về màu sắc, typography, layout và linh kiện giao diện để 6 thành viên khi tự code hoặc prompt AI sinh UI sẽ có giao diện đồng bộ 100%, không bị lệch tông.

---

## 1. Triết lý thiết kế & Theme

- **Chủ đề:** Giao diện giao thông xanh thông minh (Smart Eco-Friendly Electric Mobility) phục vụ Đô thị ĐHQG-HCM (VNU-HCM).
- **Phong cách:** Hiện đại, tối giản (Clean Modern UI), phân cấp thông tin rõ ràng, nhiều thẻ (Card-based), bo góc mềm mại (`rounded-xl` / `rounded-2xl`).

---

## 2. Bảng mã màu chuẩn (Design Color Palette)

Áp dụng bảng màu tương thích trực tiếp với mã màu **Tailwind CSS**:

| Vai trò màu | Tên màu | HEX Code | Tailwind Class | Ứng dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Primary (Chủ đạo)** | Emerald Green | `#10B981` / `#059669` | `bg-emerald-500` / `600` | Nút hành động chính (Đặt xe, Check-in, Hoàn tất), icon xe xanh, thương hiệu |
| **Secondary (Công nghệ/Sạc)** | Electric Cyan / Blue | `#06B6D4` / `#0284C7` | `bg-cyan-500` / `sky-600` | Trạng thái cổng sạc, chỉ số pin điện, liên kết điều hướng |
| **Warning (Cảnh báo)** | Amber / Orange | `#F59E0B` | `bg-amber-500` | Pin yếu (<20%), trạm sắp đầy (>85%), xe đang chờ sạc |
| **Danger (Lỗi / Sự cố)** | Rose Red | `#EF4444` | `bg-rose-500` | Báo hỏng, cổng sạc ngừng hoạt động, trạm hết chỗ, hủy lịch |
| **Background (Nền App)** | Slate Light | `#F8FAFC` | `bg-slate-50` | Nền chung cho toàn bộ app sinh viên và dashboard |
| **Surface (Nền thẻ)** | Pure White | `#FFFFFF` | `bg-white` | Các Card thông tin, Modal popup, Bảng dữ liệu |
| **Text Primary** | Slate 900 | `#0F172A` | `text-slate-900` | Tiêu đề lớn, tên trạm, nhãn quan trọng |
| **Text Secondary** | Slate 500 | `#64748B` | `text-slate-500` | Mô tả phụ, timestamp, thông số kỹ thuật mờ |

---

## 3. Quy chuẩn trạng thái (Status Badges)

Mọi thành viên khi hiển thị trạng thái của Xe, Chỗ đỗ, Cổng sạc hoặc Vé đặt chỗ **phải dùng đúng màu quy ước**:

```html
<!-- Sẵn sàng / Hoạt động tốt -->
<span class="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 rounded-full">Available</span>

<!-- Đang giữ chỗ / Đang sử dụng -->
<span class="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-100 rounded-full">In Use / Reserved</span>

<!-- Pin yếu / Sắp đầy / Đang chờ xử lý -->
<span class="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">Needs Charging / Pending</span>

<!-- Hỏng hóc / Đã hủy / Hết chỗ -->
<span class="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-100 rounded-full">Faulted / Full / Cancelled</span>
```

---

## 4. Typography & Font chữ

- **Font chữ khuyến nghị:** `Inter`, `Plus Jakarta Sans`, hoặc System Font (`font-sans`).
- **Phân cấp kích cỡ chữ:**
  - Tiêu đề màn hình: `text-2xl font-bold text-slate-900`
  - Tiêu đề Section / Thẻ card: `text-lg font-semibold text-slate-800`
  - Nội dung chính: `text-sm font-medium text-slate-700`
  - Chữ chú thích / Timestamp: `text-xs text-slate-500`

---

## 5. Quy chuẩn Layout Web Desktop (1440 x 900 px)

Hệ thống được xây dựng dưới dạng **1 ứng dụng Web Desktop duy nhất** (`1440 x 900 px`), có thanh Navbar trên cùng cho phép chuyển đổi vai trò (`Switch Role: Sinh viên ⟷ Ban vận hành`) để phục vụ demo thuận tiện.

### A. Cổng Sinh viên (Student Portal — Thành viên 1, 2, 3)
- **Cấu trúc màn hình:**
  1. **Top Navbar (`h-16 bg-white border-b border-slate-200`):** Logo VNU-HCM SmartHub, Menu chính (*Bản đồ Hub*, *Thuê xe*, *Đỗ & Sạc xe*), Ô tìm kiếm nhanh, Avatar sinh viên.
  2. **Sub-header / Filter bar:** Các bộ lọc theo trạm (KTX Khu A, KTX Khu B, Ga Metro), trạng thái pin, thời gian đỗ.
  3. **Main Content Area:**
     - Dạng lưới thẻ (Grid Cards `grid-cols-3` hoặc `grid-cols-4`) hiển thị danh sách xe/chỗ đỗ.
     - Hoặc dạng chia đôi (Split View): Bên trái là danh sách tìm kiếm, bên phải là bản đồ trạm Hub.
     - Modal popup xác nhận đặt xe / đặt chỗ đỗ kèm mã QR Check-in.

### B. Cổng Ban vận hành (Operator Dashboard — Thành viên 4, 5, 6)
- **Cấu trúc màn hình:**
  1. **Sidebar bên trái (`w-64 bg-slate-900 text-white fixed`):**
     - Logo: **SmartHub Ops**
     - Menu quản lý: *Network Map*, *Fleet & Redistribution* (Mem 4), *Smart Charging* (Mem 5), *What-if Simulation* (Mem 6), *Incidents*.
  2. **Top Header (`h-16 bg-white border-b`):** Bộ chọn Hub đang theo dõi, trạng thái kết nối cảm biến IoT, Nút thông báo sự cố đỏ, Nút Switch Role.
  3. **Dashboard Body:**
     - Hàng trên: 4 thẻ thống kê nhanh (KPI Cards: Tổng xe khả dụng, Tỉ lệ kín chỗ đỗ, Cổng sạc đang tải, Sự cố chờ xử lý).
     - Vùng chính: Bảng điều phối xe, Biểu đồ Gantt cổng sạc, hoặc Form cấu hình kịch bản mô phỏng.

---

## 6. Prompt mẫu để "Vibecode" bằng AI (Copy dùng ngay)

Khi dùng ChatGPT, Claude, Cursor, v0.dev hoặc Lovable, hãy copy đoạn prompt kèm yêu cầu màn hình của bạn:

```markdown
Build a modern, production-grade Web Desktop UI component in React + Tailwind CSS (resolution 1440x900) for a university electric mobility system called "Smart E-Mobility Hub (VNU-HCM)".
Design specifications:
- Theme: Eco-friendly electric mobility, modern clean UI.
- Colors: Primary emerald-600 (#059669), Secondary cyan-500 (#06B6D4), Background slate-50 (#F8FAFC), Card bg white (#FFFFFF), Text slate-900.
- Layout: [Chọn 1 trong 2: 
    * Student Portal: Top navigation bar with tabs (Hubs, Rentals, Parking), grid cards for vehicle/parking slots, clean booking modal.
    * Operator Dashboard: Dark left sidebar (slate-900), KPI metric cards at top, data table / Gantt chart / simulation control panel].
- Screen to build: [Điền tên màn hình của bạn, ví dụ: "Trang đặt xe điện kèm bộ lọc pin và bản đồ Hub" hoặc "Biểu đồ Gantt lịch sạc thông minh"].
- Include realistic dummy data with campus locations (KTX Khu A, KTX Khu B, Ga Metro ĐHQG, Trường ĐH Bách Khoa).
- Make sure buttons have hover states and status badges use green for available, amber for warning/low-battery, and red for error/full.
```

---

## 7. Quy chuẩn chụp và nộp ảnh vào Git

1. **Định dạng file:** `.png` rõ nét, không bị mờ chữ.
2. **Kích thước ảnh:** Chụp toàn màn hình trình duyệt ở độ phân giải Desktop (tối thiểu `1440 x 900 px`).
3. **Quy tắc đặt tên file ảnh:**
   - Cổng sinh viên: `UI_STUDENT_TenManHinh.png` (Ví dụ: `UI_STUDENT_Vehicle_Reservation.png`)
   - Cổng vận hành: `UI_OPERATOR_TenManHinh.png` (Ví dụ: `UI_OPERATOR_Charging_Schedule_Gantt.png`)
4. **Thư mục lưu trữ:**
   - Toàn bộ ảnh chụp lưu vào thư mục: docs/submission-2/ui-design/
   - Chia 2 thư mục con: `student-portal/` và `operator-portal/`.
