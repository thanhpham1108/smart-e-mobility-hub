# BẢNG PHÂN CÔNG CÔNG VIỆC — SUBMISSION #2
**Dự án:** Smart E-Mobility Hub (VNU-HCM Urban Area)  
**Môn học:** Công nghệ phần mềm (Software Engineering) — HK261  
**Quy mô nhóm:** 6 thành viên  

---

## 1. Yêu cầu nộp bài (Submission #2 Deliverables)

Theo đề bài quy định:
1. **UI Design (Mockup)** *(Group work)*: Bản thiết kế giao diện các màn hình chính (Mobile App cho sinh viên + Web Dashboard cho ban vận hành).
2. **Sequence Diagrams** *(Individual work)*: Biểu đồ tuần tự chi tiết theo chuẩn phân lớp Boundary - Controller - Entity (BCE).
3. **Activity Diagrams** *(Individual work)*: Biểu đồ hoạt động có phân làn (Swimlanes / Partitions) thể hiện rõ luồng rẽ nhánh và song song.
4. **State-Chart Diagrams** *(Bonus)*: Biểu đồ trạng thái mô tả vòng đời của các thực thể cốt lõi trong hệ thống.

---

## 2. Bảng tổng hợp phân công nhiệm vụ 6 thành viên

| STT | Thành viên (Tên / Github) | Module phụ trách (từ Submission #1) | Sequence Diagrams (Cá nhân) | Activity Diagrams (Cá nhân) | Màn hình UI Mockup (Web Desktop) | State-Chart Diagram (Bonus) |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Thành viên 1**<br>*(Hub & Identity)* | Module 1: Quản lý Định danh & Tra cứu Hub | • UC-A01: Đăng nhập & Xác thực<br>• UC-H02: Tìm kiếm Mobility Hub<br>• UC-H03: Xem trạng thái chi tiết Hub | • Luồng xác thực & phân quyền<br>• Luồng tìm kiếm & lọc Hub theo vị trí | Student Portal (Web):<br>- Đăng nhập / Đăng ký<br>- Trang chủ & Bản đồ tìm Hub<br>- Chi tiết Hub (slot, trạm sạc, xe) | Vòng đời hoạt động của Hub (`MobilityHub`) |
| **2** | **Thành viên 2**<br>*(Vehicle Rental)* | Module 2: Thuê xe điện chia sẻ (Shared EVs) | • UC-R03: Đặt trước xe điện (Reserve)<br>• UC-R04: Nhận xe & Mở khóa (Pick Up)<br>• UC-R05: Trả xe & Hoàn tất chuyến đi | • Luồng đặt giữ chỗ & đếm ngược<br>• Toàn bộ chu trình từ mở khóa đến trả xe | Student Portal (Web):<br>- Danh sách xe & Lọc theo pin<br>- Form xác nhận đặt trước xe<br>- Trang hành trình đang chạy & Trả xe | Vòng đời của Xe chia sẻ (`SharedVehicle`) & Chuyến đi (`RentalTrip`) |
| **3** | **Thành viên 3**<br>*(Parking & Private EV)* | Module 3: Đỗ xe & Sạc xe cá nhân (Private EVs) | • UC-P01: Đặt chỗ đỗ xe theo block 15p<br>• UC-P06: Check-in xe cá nhân vào bãi<br>• UC-P07: Check-out xe cá nhân | • Luồng kiểm tra chỗ trống xuyên suốt các khoảng 15p<br>• Luồng Check-in / Check-out bãi xe | Student Portal (Web):<br>- Đặt chỗ đỗ (chọn ngày & khung giờ)<br>- Vé điện tử / Mã QR Check-in<br>- Quản lý vị trí đỗ & yêu cầu sạc | Vòng đời Phiếu đặt chỗ đỗ (`ParkingReservation`) & Vị trí đỗ (`ParkingSpace`) |
| **4** | **Thành viên 4**<br>*(Fleet & Incidents)* | Module 4: Giám sát Fleet & Xử lý sự cố | • UC-F04: Điều phối xe giữa các Hub<br>• UC-F05: Xác nhận hoàn tất điều chuyển<br>• UC-I02: Tiếp nhận & Xử lý xe hỏng | • Luồng lập lệnh và điều chuyển xe<br>• Luồng báo hỏng, cô lập và bảo trì xe/trụ sạc | Operator Portal (Web):<br>- Bản đồ giám sát toàn mạng lưới Hub<br>- Quản lý lệnh điều chuyển xe<br>- Bảng xử lý Ticket sự cố | Vòng đời Phiếu sự cố (`IncidentTicket`) & Lệnh điều chuyển (`RedistributionOrder`) |
| **5** | **Thành viên 5**<br>*(Smart Charging)* | Module 5: Lập lịch sạc thông minh | • UC-C01: Xem hàng đợi & lịch sạc<br>• UC-C02: Sinh lịch sạc tự động (ưu tiên SOC)<br>• UC-C03: Điều chỉnh lịch sạc thủ công | • Thuật toán xếp hàng & ưu tiên sạc (UC-S04)<br>• Phân bổ cổng sạc và khung giờ (UC-S05) | Operator Portal (Web):<br>- Biểu đồ Gantt / Lịch biểu cổng sạc<br>- Danh sách hàng đợi sạc pin<br>- Form điều chỉnh can thiệp lịch sạc | Vòng đời Phiên sạc (`ChargingSession`) & Yêu cầu sạc (`ChargingRequest`) |
| **6** | **Thành viên 6**<br>*(What-if Simulation)* | Module 6: Mô phỏng kịch bản vận hành | • UC-W01: Cấu hình kịch bản mô phỏng<br>• UC-W02: Thực thi mô phỏng What-if<br>• UC-W05: So sánh kịch bản với thực tế | • Luồng nạp Snapshot mạng lưới & tính toán tải<br>• Luồng đánh giá tác động & sinh giải pháp đề xuất | Operator Portal (Web):<br>- Form thiết lập tham số kịch bản<br>- Bảng kết quả mô phỏng & Đề xuất<br>- Màn hình so sánh đa kịch bản | Vòng đời Kịch bản / Lần chạy mô phỏng (`SimulationRun`) |

---

## 3. Chi tiết nhiệm vụ từng thành viên

### Thành viên 1: Hub & Identity Management
- **File kịch bản tham chiếu:** [docs/submission-1/use-case-scenarios/Management Usecases.md](file:///Users/macos/Desktop/BK/261/CNPM/BTL/github/smart-e-mobility-hub/docs/submission-1/use-case-scenarios/Management%20Usecases.md)
- **Nhiệm vụ cụ thể:**
  1. **Sequence Diagrams (2-3 diagrams):**
     - `SD_SignIn_Auth`: Actor Student/Operator gửi credentials $\rightarrow$ AuthController kiểm tra DB $\rightarrow$ trả JWT token/session.
     - `SD_FindMobilityHub`: Gửi GPS/Filter $\rightarrow$ HubController $\rightarrow$ HubService lọc theo khoảng cách và tiện ích $\rightarrow$ trả về danh sách Hub.
     - `SD_ViewHubStatus`: Chọn HubId $\rightarrow$ gom số xe khả dụng, số chỗ đỗ trống, số cổng sạc trống $\rightarrow$ trả về cho UI.
  2. **Activity Diagrams (1-2 diagrams):**
     - Quy trình đăng nhập, phân quyền (Role Check: Student vs Operator).
     - Quy trình tìm kiếm và lọc Hub (có nhánh rẽ: tìm theo GPS hiện tại vs tìm theo địa điểm chỉ định).
  3. **UI Mockup:**
     - Thiết kế 3 màn hình Mobile App: (1) Đăng nhập/Đăng ký; (2) Bản đồ trang chủ & Search Hub; (3) Chi tiết Hub.
  4. **State-Chart (Bonus):**
     - Biểu đồ trạng thái Hub (`Active` $\rightarrow$ `Peak_Load` $\rightarrow$ `Maintenance` $\rightarrow$ `Offline`).

---

### Thành viên 2: Vehicle Rental
- **File kịch bản tham chiếu:** [docs/submission-1/use-case-scenarios/vehicle_rental.md](file:///Users/macos/Desktop/BK/261/CNPM/BTL/github/smart-e-mobility-hub/docs/submission-1/use-case-scenarios/vehicle_rental.md)
- **Nhiệm vụ cụ thể:**
  1. **Sequence Diagrams (3 diagrams):**
     - `SD_ReserveSharedVehicle`: Student chọn xe $\rightarrow$ RentalController kiểm tra tình trạng xe $\rightarrow$ nếu thành công thì tạo Reservation (khóa xe 15p), nếu thất bại thì gọi fallback `UC-X01` gợi ý Hub khác.
     - `SD_PickupSharedVehicle`: Quét QR/Bluetooth tại Hub $\rightarrow$ đối chiếu reservation $\rightarrow$ mở khóa xe vật lý $\rightarrow$ chuyển trạng thái xe sang `IN_USE`.
     - `SD_ReturnSharedVehicle`: Trả xe tại Hub đích $\rightarrow$ khóa xe $\rightarrow$ chốt quãng đường/thời gian $\rightarrow$ cập nhật trạng thái xe và dung lượng Hub.
  2. **Activity Diagrams (1-2 diagrams):**
     - Quy trình Đặt trước xe (kèm luồng đếm ngược timeout 15 phút và hủy tự động nếu không nhận).
     - Toàn bộ hành trình thuê xe: Đặt xe $\rightarrow$ Mở khóa $\rightarrow$ Sử dụng $\rightarrow$ Trả xe & Đánh giá/Báo lỗi.
  3. **UI Mockup:**
     - Thiết kế 3 màn hình Mobile App: (1) Danh sách xe & lọc mức pin; (2) Màn hình đếm ngược nhận xe; (3) Màn hình hành trình đang chạy & Trả xe.
  4. **State-Chart (Bonus):**
     - Vòng đời của phương tiện chia sẻ (`Available` $\rightarrow$ `Reserved` $\rightarrow$ `InUse` $\rightarrow$ `UnderMaintenance` $\rightarrow$ `Redistributing`).

---

### Thành viên 3: Parking & Private EV
- **File kịch bản tham chiếu:** [docs/submission-1/use-case-scenarios/parking_private_ev.md](file:///Users/macos/Desktop/BK/261/CNPM/BTL/github/smart-e-mobility-hub/docs/submission-1/use-case-scenarios/parking_private_ev.md)
- **Nhiệm vụ cụ thể:**
  1. **Sequence Diagrams (3 diagrams):**
     - `SD_ReserveParkingSpace`: Chọn Hub, ngày giờ đến/đi $\rightarrow$ ParkingService kiểm tra **mọi slot 15 phút liên tục** $\rightarrow$ nếu đủ chỗ thì tạo booking, nếu thiếu dù chỉ 1 slot thì trả về hết chỗ & gọi alternative Hub.
     - `SD_CheckInPrivateEV`: Quét vé QR tại cổng Hub $\rightarrow$ mở barrier $\rightarrow$ ghi nhận trạng thái đỗ thực tế (tránh đếm trùng giữa booking và xe thực tế).
     - `SD_CheckOutPrivateEV`: Rời bãi $\rightarrow$ chốt thời gian $\rightarrow$ giải phóng chỗ đỗ.
  2. **Activity Diagrams (1-2 diagrams):**
     - Quy trình kiểm tra năng lực đỗ xe liên tục (All-or-Nothing check).
     - Quy trình Check-in và Check-out có kèm xử lý đỗ quá giờ (Overstay).
  3. **UI Mockup:**
     - Thiết kế 3 màn hình Mobile App: (1) Chọn khung giờ đặt chỗ đỗ xe; (2) Vé điện tử có mã QR Check-in; (3) Màn hình quản lý đặt chỗ của tôi.
  4. **State-Chart (Bonus):**
     - Vòng đời của phiếu đặt chỗ (`Pending` $\rightarrow$ `Confirmed` $\rightarrow$ `CheckedIn` $\rightarrow$ `Completed` / `Cancelled` / `Overstayed`).

---

### Thành viên 4: Operator Fleet & Incident Management
- **File kịch bản tham chiếu:** [docs/submission-1/use-case-scenarios/operator_fleet_incident.md](file:///Users/macos/Desktop/BK/261/CNPM/BTL/github/smart-e-mobility-hub/docs/submission-1/use-case-scenarios/operator_fleet_incident.md)
- **Nhiệm vụ cụ thể:**
  1. **Sequence Diagrams (3 diagrams):**
     - `SD_CoordinateRedistribution`: Operator chọn xe tại Hub thừa và Hub thiếu $\rightarrow$ hệ thống kiểm tra tính khả thi (`UC-S03`) $\rightarrow$ tạo lệnh điều phối.
     - `SD_RecordRedistributionComplete`: Xác nhận tài xế xe tải đã giao xe đến nơi $\rightarrow$ cập nhật vị trí xe và dung lượng 2 đầu Hub.
     - `SD_HandleVehicleFailure`: Tiếp nhận báo hỏng từ sinh viên/cảm biến $\rightarrow$ khóa xe trên hệ thống $\rightarrow$ phân công kỹ thuật viên kiểm tra.
  2. **Activity Diagrams (1-2 diagrams):**
     - Quy trình tái phân bổ phương tiện trong toàn mạng lưới.
     - Quy trình xử lý sự cố (Incident handling): Tiếp nhận $\rightarrow$ Cô lập $\rightarrow$ Sửa chữa $\rightarrow$ Khôi phục trạng thái hoạt động.
  3. **UI Mockup:**
     - Thiết kế 3 màn hình Web Dashboard: (1) Tổng quan bản đồ xe & cảnh báo quá tải; (2) Màn hình tạo lệnh điều chuyển xe; (3) Quản lý danh sách sự cố & chi tiết lỗi.
  4. **State-Chart (Bonus):**
     - Vòng đời Ticket sự cố (`Reported` $\rightarrow$ `Investigating` $\rightarrow$ `ActionAssigned` $\rightarrow$ `Resolved` $\rightarrow$ `Closed`).

---

### Thành viên 5: Smart Charging Scheduling
- **File kịch bản tham chiếu:** [docs/submission-1/use-case-scenarios/smart_charging_scheduling.md](file:///Users/macos/Desktop/BK/261/CNPM/BTL/github/smart-e-mobility-hub/docs/submission-1/use-case-scenarios/smart_charging_scheduling.md)
- **Nhiệm vụ cụ thể:**
  1. **Sequence Diagrams (3 diagrams):**
     - `SD_GenerateChargingSchedule`: Operator kích hoạt lập lịch $\rightarrow$ ChargingScheduler lấy danh sách xe cần sạc $\rightarrow$ gọi `UC-S04` xếp độ ưu tiên (SOC thấp, lịch đi sớm) $\rightarrow$ gọi `UC-S05` gán cổng sạc $\rightarrow$ lưu Schedule.
     - `SD_AdjustChargingSchedule`: Operator kéo thả/điều chỉnh thủ công thời gian sạc $\rightarrow$ kiểm tra xung đột cổng $\rightarrow$ cập nhật lịch.
     - `SD_ViewChargingQueue`: Truy vấn danh sách xe đang chờ sạc và xe đang sạc.
  2. **Activity Diagrams (1-2 diagrams):**
     - Thuật toán ưu tiên sạc thông minh (Duyệt danh sách, tính điểm ưu tiên theo SOC và thời gian cần xe).
     - Quy trình phân bổ khe sạc và xử lý khi cổng sạc bị đầy / quá tải nguồn điện.
  3. **UI Mockup:**
     - Thiết kế 3 màn hình Web Dashboard: (1) Biểu đồ Gantt lịch biểu các cổng sạc; (2) Hàng đợi xe chờ sạc; (3) Modal cấu hình tham số ưu tiên.
  4. **State-Chart (Bonus):**
     - Vòng đời phiên sạc (`Submitted` $\rightarrow$ `Scheduled` $\rightarrow$ `Charging` $\rightarrow$ `Completed` / `Interrupted`).

---

### Thành viên 6: What-if Simulation
- **File kịch bản tham chiếu:** [docs/submission-1/use-case-scenarios/what_if_simulation.md](file:///Users/macos/Desktop/BK/261/CNPM/BTL/github/smart-e-mobility-hub/docs/submission-1/use-case-scenarios/what_if_simulation.md)
- **Nhiệm vụ cụ thể:**
  1. **Sequence Diagrams (3 diagrams):**
     - `SD_ConfigureScenario`: Operator nhập tham số (giờ cao điểm Metro, lượng xe đến tăng 200%, hỏng 2 cổng sạc) $\rightarrow$ lưu kịch bản giả lập.
     - `SD_RunWhatIfSimulation`: Kích hoạt chạy $\rightarrow$ lấy Snapshot hệ thống hiện tại (`UC-S06`) $\rightarrow$ chạy mô phỏng tải (`UC-S07`) $\rightarrow$ sinh đề xuất điều phối (`UC-S08`) mà không làm ảnh hưởng hệ thống thật.
     - `SD_CompareScenarios`: Truy vấn 2 lần chạy mô phỏng $\rightarrow$ so sánh các chỉ số nghẽn, doanh thu, độ trễ.
  2. **Activity Diagrams (1-2 diagrams):**
     - Quy trình thực thi mô phỏng giả lập từ Snapshot đến Xuất báo cáo khuyến nghị.
     - Quy trình so sánh và đánh giá hiệu quả giữa các phương án can thiệp.
  3. **UI Mockup:**
     - Thiết kế 3 màn hình Web Dashboard: (1) Form cấu hình tham số kịch bản; (2) Màn hình kết quả mô phỏng & Đề xuất điều phối; (3) Biểu đồ so sánh kịch bản.
  4. **State-Chart (Bonus):**
     - Vòng đời của lần chạy mô phỏng (`Draft` $\rightarrow$ `Configured` $\rightarrow$ `Running` $\rightarrow$ `Finished` $\rightarrow$ `Archived`).

---

## 4. Quy chuẩn kỹ thuật & Tổ chức Git

### A. Định dạng nộp bài trong Git
- **Mã nguồn biểu đồ:** Viết bằng PlantUML (`.puml`) hoặc Mermaid (`.md`) lưu tại đúng thư mục được chỉ định:
  - `docs/submission-2/sequence-diagrams/`
  - `docs/submission-2/activity-diagrams/`
  - `docs/submission-2/state-chart-diagrams/`
- **Hình ảnh xuất ra:** Đặt tên rõ ràng (ví dụ: `SD_ReserveSharedVehicle.png`), lưu tại thư mục tương ứng để tiện nhúng vào file báo cáo tổng hợp.
- **UI Mockup (Figma hoặc Vibe-code):** 
  - Xem hướng dẫn chi tiết về màu sắc, typography và prompt mẫu tại: [docs/submission-2/ui-design/ui_guidelines.md](file:///Users/macos/Desktop/BK/261/CNPM/BTL/github/smart-e-mobility-hub/docs/submission-2/ui-design/ui_guidelines.md).
  - Có thể vibe-code trực tiếp giao diện (React / Tailwind) rồi chụp ảnh màn hình lưu vào `docs/submission-2/ui-design/mobile-app/` hoặc `docs/submission-2/ui-design/web-dashboard/`.
  - Nếu làm trên Figma, đính kèm link Figma dự án vào file `figma_links.md`.

### B. Quy tắc vẽ Sequence Diagram (Bắt buộc)
1. **Kiến trúc phân tầng BCE:** Phải có đủ 4 thành phần:
   - `Actor` (Student hoặc Operator)
   - `Boundary` (Giao diện Mobile/Web)
   - `Controller` (Xử lý nghiệp vụ / API)
   - `Entity / Database` (Bảng dữ liệu / Kho lưu trữ)
2. **Khung điều khiển (Fragments):** Phải thể hiện đầy đủ các trường hợp:
   - `alt ... else`: Trường hợp thành công và trường hợp thất bại/ngoại lệ.
   - `opt`: Hành động tùy chọn (ví dụ: người dùng chọn gửi báo cáo kèm theo).
   - `loop`: Các vòng lặp kiểm tra từng phần tử.

### C. Quy tắc vẽ Activity Diagram (Bắt buộc)
1. **Phân làn (Swimlanes):** Bắt buộc chia tối thiểu 3 làn: `Người dùng (Actor)`, `Hệ thống (System/Controller)`, `Cơ sở dữ liệu (Database)`.
2. **Ký hiệu chuẩn UML:** Nút bắt đầu (chấm tròn đặc), nút kết thúc (chấm tròn có viền ngoài), hình thoi rẽ nhánh (Decision diamond), thanh song song (Fork/Join bar).

---

## 5. Tiến độ gợi ý (Timeline)

- **Ngày 1 - 2:** Thống nhất Layout UI & Design System trên Figma; mỗi bạn vẽ wireframe sơ bộ cho 3 màn hình của mình.
- **Ngày 3 - 4:** Hoàn thành Sequence Diagrams theo đúng kịch bản của Submission #1.
- **Ngày 5:** Hoàn thành Activity Diagrams & State-Chart Diagram (Bonus).
- **Ngày 6:** Review chéo (Peer Review) giữa các thành viên, kiểm tra tính nhất quán về tên hàm, tên bảng và luồng dữ liệu.
- **Ngày 7:** Xuất toàn bộ file sang PDF/Word và nộp bài.
