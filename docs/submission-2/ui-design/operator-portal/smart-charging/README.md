# UI MOCKUPS — MODULE 5: SMART CHARGING SCHEDULING

**Responsible Member:** Member 5 (Smart Charging Scheduling)  
**Target Platform:** Operator Portal (Web Desktop `1440 x 900 px`)  
**Design Guidelines Adherence:** [ui_guidelines.md](../../ui_guidelines.md)

---

## 1. Danh sách màn hình bàn giao (Deliverables)

| STT | Tên file ảnh (1440 x 900 px) | Mã nguồn HTML / Tailwind | Nghiệp vụ Use Case | Mô tả tính năng |
| :---: | :--- | :--- | :--- | :--- |
| **1** | [UI_OPERATOR_Charging_Schedule_Gantt.png](UI_OPERATOR_Charging_Schedule_Gantt.png) | [UI_OPERATOR_Charging_Schedule_Gantt.html](UI_OPERATOR_Charging_Schedule_Gantt.html) | **UC-C01 / UC-S05** | Biểu đồ Gantt trực quan lịch biểu 10 cổng sạc (DC 60kW & AC 11kW) theo trục thời gian 07:00 – 18:00, hiển thị đường thời gian thực `Now (10:30)` và trạng thái tải điện lưới. |
| **2** | [UI_OPERATOR_Charging_Queue.png](UI_OPERATOR_Charging_Queue.png) | [UI_OPERATOR_Charging_Queue.html](UI_OPERATOR_Charging_Queue.html) | **UC-C01 / UC-S04** | Giao diện Dual-Panel: Bảng hàng đợi sạc FCFS theo độ ưu tiên pin (Rank #1 đến #5) song song với bảng giám sát từ xa các phiên đang sạc thực tế (kW, A, %, nút ngắt an toàn). |
| **3** | [UI_OPERATOR_Adjust_Schedule_Modal.png](UI_OPERATOR_Adjust_Schedule_Modal.png) | [UI_OPERATOR_Adjust_Schedule_Modal.html](UI_OPERATOR_Adjust_Schedule_Modal.html) | **UC-C03** | Hộp thoại Modal can thiệp thủ công: Đổi cổng sạc, điều chỉnh khung giờ, hạ target SOC khi khẩn cấp và chạy module tự động kiểm tra xung đột cổng/tải điện lưới. |

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
  * **Cột trái (Hàng đợi FCFS & Ưu tiên SOC):** Hiển thị rõ biển số, dòng xe (VF e34, Dat Bike, Feliz), mức pin khởi điểm, giờ đến, giờ hẹn khởi hành và thời gian ước tính được cấp cổng. Xe `#1` có pin 14% được gắn cờ đỏ "Pin khẩn cấp" để ưu tiên xếp vào cổng DC-03 trống.
  * **Cột phải (Giám sát telemetry 8 phiên đang sạc):** Hiển thị công suất tức thời (52.4 kW, 48.0 kW, 11.0 kW), điện lượng tích lũy (kWh), thanh tiến độ pin SOC và nút **Dừng khẩn cấp (`abortCharging()`)** màu đỏ rose.

### Màn hình 3: Modal can thiệp điều chỉnh lịch sạc thủ công
* **Mục tiêu:** Thực hiện Use Case `UC-C03`, cho phép kỹ sư vận hành linh hoạt can thiệp khi có trường hợp khẩn cấp mà không làm gãy vỡ hệ thống.
* **Đặc điểm nổi bật:**
  * **Thẻ lựa chọn cổng sạc:** Thể hiện rõ cổng trống khả dụng ngay (`DC-03`), cổng đang bận (`DC-01`), và cổng tốc độ thấp không kịp giờ (`AC-04`).
  * **Thanh trượt điều chỉnh Target SOC:** Hạ mục tiêu từ 80% xuống 75% để rút ngắn thời gian sạc từ 45 phút xuống còn 30 phút, đảm bảo tài xế sinh viên kịp giờ bảo vệ đồ án tốt nghiệp lúc 11:45.
  * **Hộp xác nhận không xung đột (Conflict-Free Verification):** Kiểm tra tự động 3 tiêu chí an toàn (Cổng trống, Tải đỉnh lưới < 80%, Hoàn tất sớm hơn giờ khởi hành 40 phút).
