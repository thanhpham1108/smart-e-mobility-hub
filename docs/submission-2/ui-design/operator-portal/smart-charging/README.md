# UI MOCKUPS — MODULE 5: SMART CHARGING SCHEDULING

**Responsible Member:** Member 5 (Smart Charging Scheduling)  
**Target Platform:** Operator Portal (Web Desktop `1440 x 900 px`)  
**Design Guidelines Adherence:** [ui_guidelines.md](../../hud-identity/ui_guidelines.md)

---

## 1. Danh sách màn hình bàn giao (Deliverables)

| STT | Tên file ảnh (1440 x 900 px) | Mã nguồn HTML / Tailwind | Nghiệp vụ Use Case | Mô tả tính năng |
| :---: | :--- | :--- | :--- | :--- |
| **1** | [UI_OPERATOR_Charging_Schedule_Gantt.png](UI_OPERATOR_Charging_Schedule_Gantt.png) | [UI_OPERATOR_Charging_Schedule_Gantt.html](UI_OPERATOR_Charging_Schedule_Gantt.html) | **UC-C01 / UC-C02** | Biểu đồ Gantt trực quan lịch biểu 10 cổng sạc (DC 60kW & AC 11kW) theo trục thời gian 07:00 – 18:00, hiển thị đường thời gian thực `Now (10:30)` và trạng thái tải điện lưới. |
| **2** | [UI_OPERATOR_Charging_Queue.png](UI_OPERATOR_Charging_Queue.png) | [UI_OPERATOR_Charging_Queue.html](UI_OPERATOR_Charging_Queue.html) | **UC-C01** | Giao diện Dual-Panel: lịch đã gán theo FCFS và nhóm waitlist có vị trí riêng, không có cổng được gán cho đến khi capacity mở; bên cạnh là bảng giám sát các phiên sạc thực tế (kW, A, %, nút ngắt an toàn). |
| **3** | [UI_OPERATOR_Adjust_Schedule_Modal.png](UI_OPERATOR_Adjust_Schedule_Modal.png) | [UI_OPERATOR_Adjust_Schedule_Modal.html](UI_OPERATOR_Adjust_Schedule_Modal.html) | **UC-C03** | Hộp thoại điều chỉnh lịch thủ công: Đổi cổng sạc, khung giờ và mức pin mục tiêu; kiểm tra xung đột trước khi lưu. |

---

## 2. Chi tiết từng màn hình thiết kế

### Màn hình 1: Biểu đồ Gantt Lịch biểu Cổng sạc
* **Mục tiêu:** Cung cấp góc nhìn toàn cảnh về lịch phân bổ 10 cổng sạc tại Hub KTX Khu B trong suốt ngày làm việc (07:00 – 18:00).
* **Đặc điểm nổi bật:**
  * **Trục tung:** 10 cổng sạc (4 cổng DC 60kW Fast CCS2, 6 cổng AC 11kW Type 2).
  * **Trục hoành:** Thang thời gian từ 07:00 đến 18:00 có kẻ lưới dọc từng giờ.
  * **Đường đỏ thời gian thực "HIỆN TẠI (10:30)":** Cắt dọc qua tất cả các cổng, phân tách trực quan giữa các phiên đã hoàn tất (màu xám mờ), phiên đang sạc (xanh ngọc Emerald gradient), và các phiên hẹn trước trong tương lai (xanh dương Sky).
  * **Trạng thái cổng sự cố:** Cổng DC-04 hiển thị dải đỏ sọc bảo trì cảm biến nhiệt độ rơ-le kèm số hiệu ticket bảo trì `#TK-209`.

### Màn hình 2: Hàng đợi xe chờ sạc & Giám sát phiên sạc thời gian thực
* **Mục tiêu:** Phục vụ trực ban vận hành xử lý luồng xe đến trạm theo thuật toán FCFS và giám sát an toàn điện.
* **Đặc điểm nổi bật:**
  * **Cột trái (Hàng đợi FCFS):** Hiển thị rõ biển số, dòng xe (VF e34, Dat Bike, Feliz), mức pin khởi điểm, giờ gửi yêu cầu, giờ hẹn khởi hành, vị trí hàng chờ và cổng được gán nếu đã có suất. Mức pin chỉ phân định thứ tự khi hai yêu cầu có cùng thời điểm gửi.
  * **Cột phải (Giám sát telemetry 8 phiên đang sạc):** Hiển thị công suất tức thời, điện lượng tích lũy, phần trăm pin và nút dừng khẩn cấp.

### Màn hình 3: Modal can thiệp điều chỉnh lịch sạc thủ công
* **Mục tiêu:** Thực hiện Use Case `UC-C03`, cho phép người vận hành điều chỉnh lịch khi cần và kiểm tra xung đột trước khi lưu.
* **Đặc điểm nổi bật:**
  * **Thẻ lựa chọn cổng sạc:** Thể hiện rõ cổng trống khả dụng ngay (`DC-03`), cổng đang bận (`DC-01`), và cổng tốc độ thấp không kịp giờ (`AC-04`).
  * **Thanh trượt mức pin mục tiêu:** Ví dụ điều chỉnh từ 80% xuống 75% khi thay đổi thời lượng sạc thủ công. Thao tác này không thay đổi quy tắc xếp hàng FCFS.
  * **Hộp xác nhận không xung đột (Conflict-Free Verification):** Kiểm tra tự động 3 tiêu chí an toàn (Cổng trống, Tải đỉnh lưới < 80%, Hoàn tất sớm hơn giờ khởi hành 40 phút).
