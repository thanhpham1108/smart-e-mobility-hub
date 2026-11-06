# Bảng phân công — Submission 3

**Dự án:** Smart E-Mobility Hub

**Nguồn yêu cầu:** [BTL Software Engineering HK26, mục “Submission #3 detail”](../BTL_SoftwareEngineering_HK26_v1.pdf)

**Nguyên tắc:** Mỗi thành viên tiếp tục module đã phụ trách ở Submission 1–2 và đóng góp vào **cả hai architectural view**, class/method design của module mình, và test case bonus.

## 1. Deliverables chung

| Hạng mục | Sản phẩm cần giao | Cách ghép nhóm |
| --- | --- | --- |
| Deployment view | UML deployment diagram có node, artifact, luồng giao tiếp và nguồn dữ liệu mô phỏng | Cả sáu bạn kiểm tra phần module của mình; thành viên 1 tổng hợp bản chung |
| Development/Implementation view | Sơ đồ package/component, dependency và interface giữa sáu module | Cả sáu bạn kiểm tra phần module của mình; thành viên 4 tổng hợp bản chung |
| Class diagram | Một diagram rõ ràng cho mỗi module, thuộc tính/trạng thái, association và operation cần thiết | Chỉ tham chiếu class của module khác; không định nghĩa lại class dùng chung |
| Method descriptions | Bảng mô tả **tất cả** operation xuất hiện trong class diagram | Tên, tham số và kiểu trả về khớp chính xác với diagram |
| Test cases *(bonus)* | Khoảng ba ca kiểm thử/module: thành công, ngoại lệ, tình huống biên | Nêu UC, điều kiện đầu, dữ liệu/steps và kết quả mong đợi |

Hai architectural view khởi đầu ở [deployment-view](deployment-view/Deployment_View.puml) và [development-view](development-view/Implementation_View.puml). [Architecture baseline](architectural-design/architecture_baseline.md) là hợp đồng chung để mọi người thiết kế class nhất quán.

## 2. Phân công theo module

| # | Thành viên | Module và UC tham chiếu | Class thuộc quyền thiết kế | Đóng góp cụ thể vào architectural view | Test case bonus gợi ý |
| --- | --- | --- | --- | --- | --- |
| **1** | **Võ Hoàng Phúc Duy — 2452214** | Authentication, Hub & Identity: UC-A01–A02, UC-H01–H03, UC-X01 | `User`, `Session`, `MobilityHub`, `AuthService`, `HubService` | Student/Operator client, xác thực, tìm và xem Hub; tổng hợp deployment view | Đăng nhập hợp lệ; từ chối sai vai trò; tìm Hub không có kết quả hoặc dữ liệu trạng thái cũ |
| **2** | **Nguyễn Khải Ca — 2452159** | Vehicle Rental: UC-R01–R08 | `SharedVehicle`, `VehicleReservation`, `RentalTrip`, `RentalService` | Package thuê xe; dependency tới Hub, Parking và Incident | Đặt/nhận xe; hai yêu cầu giữ cùng xe hoặc giữ chỗ hết hạn; trả xe báo lỗi không trở lại Available |
| **3** | **Nguyễn Phước Nhật Duy — 2452205** | Parking & Private EV: UC-P01–P07 | `ParkingSpace`, `ParkingReservation`, `ParkingSession`, `ParkingService` | Package parking; giao tiếp tạo/hủy yêu cầu sạc với module 5 | Đặt đủ toàn bộ slot 15 phút; hết chỗ ở một slot thì từ chối cả khoảng; check-in/out không đếm chỗ hai lần |
| **4** | **Mai Hoàng Phương Đông — 2452265** | Fleet & Incident: UC-F01–F05, UC-I01–I03; telemetry UC-T01–T03 | `RedistributionOrder`, `IncidentTicket`, `FleetService`, `TelemetryAdapter` | Package vận hành, incident, telemetry simulator; tổng hợp implementation view | Điều chuyển hợp lệ; từ chối Hub đích thiếu chỗ; telemetry lỗi/stale không mở lại tài nguyên |
| **5** | **Phạm Nguyễn Công Thành — 2453175** | Smart Charging: UC-C01–C03 | `ChargingRequest`, `ChargingPoint`, `ChargingSchedule`, `ChargingService` | Package sạc; interface với Parking và Fleet | FCFS theo thời điểm gửi; trùng timestamp thì pin thấp hơn trước; thiếu cổng hoặc điều chỉnh gây xung đột |
| **6** | **Nguyễn Xuân An — 2452023** | What-if Simulation: UC-W01–W05 | `WhatIfScenario`, `NetworkSnapshot`, `SimulationRun`, `SimulationService` | Package mô phỏng và các dependency chỉ đọc snapshot; rà traceability khi ghép | Chạy mô phỏng thành công; thay đổi giả lập không sửa trạng thái thật; so sánh hai run khác khoảng thời gian |

Tên class là **đề xuất thống nhất ban đầu**. Nếu một thành viên đổi tên hoặc bổ sung class, cập nhật chủ sở hữu và dependency trong architecture baseline trước khi ghép diagram.

## 3. Ranh giới giữa module

- Thành viên **1** sở hữu `MobilityHub` và logic tìm Hub thay thế (UC-X01). Thành viên 2 và 3 gọi dịch vụ Hub khi cần; không sao chép class Hub.
- Thành viên **2** sở hữu `SharedVehicle`. Thành viên 4 có thể đặt hạn chế vận hành khi có incident/telemetry; thành viên 6 chỉ đọc snapshot.
- Thành viên **3** sở hữu `ParkingReservation` và `ParkingSession`. UC-P02/P05 gọi dịch vụ sạc của thành viên 5; hủy yêu cầu sạc không tự hủy booking parking.
- Thành viên **5** sở hữu `ChargingRequest`, `ChargingPoint`, `ChargingSchedule`. Thành viên 4 báo tình trạng lỗi thiết bị, không tự gán lại lịch; thành viên 6 chỉ mô phỏng thay đổi trên bản sao.
- Thành viên **4** sở hữu cổng nhận telemetry: xác thực nguồn, kiểm tra timestamp/duplicate, rồi chuyển cập nhật cho module sở hữu tài nguyên. Telemetry không được ghi đè reservation hoặc active session.
- Thành viên **6** dùng `NetworkSnapshot` tách khỏi dữ liệu live; xem recommendation không đồng nghĩa áp dụng vào hệ thống thật.

## 4. Định dạng giao bài cá nhân

Mỗi người nộp bốn phần vào các thư mục đã có trong `docs/submission-3/`:

1. `class-diagram/<module>.puml` và ảnh xuất cùng tên. Diagram thể hiện class, thuộc tính cốt lõi, operation, quan hệ/multiplicity; class ngoài module chỉ là tham chiếu.
2. `method-design/<module>.md`: mỗi operation trên diagram có đúng một mô tả gồm **mục đích; input và kiểu; output và kiểu; tiền điều kiện; hậu điều kiện/tác động; lỗi/ngoại lệ**. Không liệt kê method không có trên diagram.
3. `test-cases/<module>.md`: mỗi case có ID, UC, trạng thái ban đầu, bước/dữ liệu, kết quả mong đợi; kiểm tra cả trạng thái dữ liệu sau thao tác.
4. Góp ý trực tiếp cho hai view chung: node/artifact của module trong deployment view, package/interface/dependency trong implementation view.

## 5. Nhịp làm và nghiệm thu

1. **Chốt hợp đồng chung:** mọi người đọc hai view khởi đầu, thống nhất tên class, trạng thái và giao tiếp liên module.
2. **Thiết kế cá nhân:** hoàn thành class diagram, mô tả method và test case của module mình.
3. **Review chéo:** cặp 1↔2 kiểm tra Hub/Rental; 3↔5 kiểm tra Parking/Charging; 4↔6 kiểm tra Fleet/Simulation. Các điểm nối telemetry, incident và snapshot được rà cùng chủ sở hữu tài nguyên.
4. **Ghép tài liệu:** thành viên 1 và 4 cập nhật hai view chung; thành viên 6 đối chiếu UC → class/method → test case; cả nhóm xác nhận diagram và mô tả khớp nhau.

Hoàn thành khi cả hai architectural view có thể giải thích được cách triển khai/phụ thuộc, mọi operation trên sáu class diagram đều có mô tả, và các quy tắc từ Submission 1–2 (đặc biệt reservation, FCFS và tách simulation khỏi live state) được giữ nhất quán. Hạn nộp lấy từ LMS; đề PDF không ghi ngày cụ thể.
