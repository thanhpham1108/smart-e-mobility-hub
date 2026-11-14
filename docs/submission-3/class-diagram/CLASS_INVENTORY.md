# Tổng class inventory — Submission 3

**Inventory hiện tại cho cả sáu module.** Các diagram và method catalogue chính nằm trong các thư mục module ở `docs/submission-3/`; các commit/branch ban đầu chỉ ghi nguồn đóng góp. `<<external>>` trong diagram của một thành viên chỉ là **tham chiếu**, không tính thành class do người đó sở hữu. Enum và data contract được ghi riêng bên dưới.

| # | Module / nguồn | Class do module sở hữu | Trách nhiệm và điểm nối chính |
| --- | --- | --- | --- |
| 1 | Hub & Identity — `fd9de76` trên `main` | `User`, `Session`, `MobilityHub`, `Location`, `HubSearchCriteria`, `AuthService`, `HubService` | Xác thực/role, tìm và xem Hub. Rental/Parking gọi `HubService`; Charging dùng Hub ID; What-if đọc Hub state qua snapshot. |
| 2 | Vehicle Rental — `550aff9` trên `docs/vehicle-rental` | `SharedVehicle`, `VehicleReservation`, `RentalTrip`, `RentalService` | Giữ/nhận/trả xe và vòng đời xe. Dùng Hub/Parking; báo vấn đề cho Fleet. What-if chỉ đọc bản sao trạng thái xe. |
| 3 | Parking & Private EV — `5991c86` trên `docs/sub3-parking-private-ev` | `ParkingSpace`, `ParkingReservation`, `ParkingSession`, `ParkingService` | Giữ chỗ, check-in/out và yêu cầu sạc xe tư nhân. Gọi Charging để gửi/hủy request; Charging phải kiểm tra cửa sổ đỗ. |
| 4 | Fleet & Incident — `270ef08` trên `sub4-mem3` | `RedistributionOrder`, `IncidentTicket`, `FleetService`, `IncidentService`, `TelemetryAdapter` | Điều chuyển, sự cố, intake telemetry. Gọi chủ sở hữu xe/cổng/chỗ đỗ để hạn chế hoặc khôi phục; không tự sửa trạng thái tài nguyên của module khác. |
| 5 | Smart Charging — [inventory riêng](smart-charging/05-smart-charging-inventory.md) | `ChargingRequest`, `ChargingPoint`, `ChargingAllocation`, `ChargingSchedule`, `ChargingService` | Xử lý request FCFS, gán point và interval, tạo/đổi lịch; nhận request từ Parking và tình trạng cổng từ Fleet; cấp snapshot chỉ đọc cho What-if. |
| 6 | What-if Simulation — [inventory riêng](what-if/06-what-if-inventory.md) | `WhatIfScenario`, `NetworkSnapshot`, `SimulationRun`, `SimulationResult`, `Recommendation`, `SimulationService` | Cấu hình/run, giữ baseline cô lập, kết quả, đề xuất và so sánh. Đọc bản sao từ năm module; không thực thi đề xuất lên dữ liệu thật. |

## Từng class để đối chiếu với diagram

Các cột dưới đây tóm tắt **thuộc tính và operation quan trọng**, không thay method catalogue có đủ tham số/kiểu/lỗi. Mỗi hàng là một class do đúng một module sở hữu.

| Module | Class | Thuộc tính/trạng thái chính | Operation hoặc trách nhiệm chính |
| --- | --- | --- | --- |
| Hub | `User` | `userId`, contact, `role` | `updatePermittedProfile` |
| Hub | `Session` | `sessionId`, `userId`, `role`, thời hạn | `isActive` |
| Hub | `MobilityHub` | `hubId`, vị trí, công suất/số lượng xe, chỗ đỗ, cổng, `lastUpdated` | Trạng thái Hub; truy vấn qua `HubService` |
| Hub | `Location` | tọa độ, địa chỉ | Value object cho Hub/search |
| Hub | `HubSearchCriteria` | vị trí, bán kính, dịch vụ cần có | Đầu vào tìm Hub |
| Hub | `AuthService` | — | `authenticate`, `authorize`, `endSession` |
| Hub | `HubService` | — | `findHubs`, `getHubStatus`, `findAlternativeHubs` |
| Rental | `SharedVehicle` | ID, loại, Hub hiện tại, pin, status/condition | Kiểm tra availability, reserve/release, bắt đầu/kết thúc rental |
| Rental | `VehicleReservation` | booking ID, Student/vehicle ID, thời hạn, status | Kiểm tra expiry/pickup/cancel; chuyển trạng thái |
| Rental | `RentalTrip` | trip ID, Hub đầu/cuối, giờ và quãng đường, status | Kiểm tra active và hoàn thành trip |
| Rental | `RentalService` | hold mặc định 15 phút | Tìm xe, đặt/nhận/trả, lịch sử, báo lỗi, expiry, telemetry |
| Parking | `ParkingSpace` | space ID, Hub ID, in-service | Tài nguyên chỗ đỗ; phiên đỗ dùng qua thời gian |
| Parking | `ParkingReservation` | reservation/owner/vehicle/Hub ID, khoảng đỗ, slot hold, deadline, status | `isCheckInWindowOpen` |
| Parking | `ParkingSession` | session ID, actual arrival/departure, status | Phiên đỗ Active/Closed |
| Parking | `ParkingService` | — | Review/reserve, gửi/hủy charging, bookings, check-in/out, expiry |
| Fleet | `RedistributionOrder` | source/destination Hub, assigned/arrived vehicles, status, version | Ghi nhận arrival, AtRisk và transition |
| Fleet | `IncidentTicket` | resource/fault, status, evidence, repair/version | Thêm evidence và transition |
| Fleet | `FleetService` | — | Network overview, điều chuyển, kiểm tra sức khỏe mạng |
| Fleet | `IncidentService` | — | Nhận lỗi, xử lý/resolve/close incident |
| Fleet | `TelemetryAdapter` | — | Xác minh và chuyển vehicle/parking/charging observations |
| Charging | `ChargingRequest` | request/Hub/vehicle, thời điểm gửi, pin, requested window, `estimatedEnergyKwh`, `activeSessionId`, status | `Waiting` chưa có allocation; Scheduled/Charging có một allocation; năng lượng là ước lượng theo cấu hình |
| Charging | `ChargingPoint` | point/Hub ID, status, tập incident restrictions, reconciliation hold, freshness, công suất | `isOperational` |
| Charging | `ChargingAllocation` | allocation ID, start/end; liên kết request/point | `overlaps` |
| Charging | `ChargingSchedule` | schedule/Hub ID, kỳ lập lịch, generatedAt, version | `hasConflict`; chứa allocations |
| Charging | `ChargingService` | — | Queue, generate, adjust có version, submit/cancel/stop, session event, point observation/restriction, snapshot |
| What-if | `WhatIfScenario` | conditions, kỳ mô phỏng, assumptions, status | `isReadyToRun` |
| What-if | `NetworkSnapshot` | snapshot/source snapshot ID, capturedAt, source versions và năm nguồn state | `copyForSimulation` tạo ID mới |
| What-if | `SimulationRun` | run ID, lifecycle status, times, failure reason | `isCompleted` |
| What-if | `SimulationResult` | capacity, utilization, availability, congestion, unserved demand | Kết quả dự đoán của run Completed |
| What-if | `Recommendation` | type, target, nội dung, expected effect | Đề xuất để đọc, không có `apply()` |
| What-if | `SimulationService` | — | Configure, run, view result/recommendations, compare |

## Bảng quan hệ liên module cần review

| Bên cần dữ liệu | Nguồn / chiều gọi | Điều phải nhất quán giữa diagram và method |
| --- | --- | --- |
| Rental | Hub, Parking, Fleet | Hub status/alternatives; chỗ trả xe; gửi báo cáo lỗi. `SharedVehicle` vẫn do Rental sở hữu. |
| Parking | Hub, Charging | `ParkingService.submitCharging` tạo Scheduled request khi đã đến lúc bắt đầu và cổng rảnh; khung giờ tương lai hoặc Hub đầy thì lưu Waiting không allocation. Chỉ báo Full khi request đủ điều kiện nhưng cổng bận; ước lượng thời lượng không từ chối request. Cancellation/no-show/checkout phối hợp xóa Waiting hoặc giải phóng allocation. `ParkingReservation` vẫn do Parking sở hữu. |
| Charging | Parking, Fleet | Kiểm tra cửa sổ đỗ; áp dụng observation/incident đã xác minh. `ChargingPoint` và `ChargingAllocation` do Charging sở hữu. |
| Fleet | Rental, Parking, Charging, Hub | Thu thập status, gửi hạn chế vận hành tới chủ sở hữu; telemetry không ghi đè booking/session/đặt chỗ tương lai. |
| What-if | Snapshot contract đọc Hub, Rental, Parking, Fleet, Charging | Bản chụp nhất quán/đủ dữ liệu; các thao tác mô phỏng chỉ sửa bản sao. |

## Kiểu và enum quan trọng

- Hub: `Role`, `HubStatus`; Rental: `VehicleType`, `VehicleStatus`, `VehicleCondition`, `ReservationStatus`, `TripStatus`; Parking: `ReservationStatus`, `ParkingSessionStatus`. Hai tên `ReservationStatus` thuộc **hai package khác nhau**, không nên coi là một enum dùng chung.
- Charging: `RequestStatus`, `PointStatus`. Request `Waiting` chưa có allocation; khi được gán thì có tối đa một allocation. `ChargingSchedule` là cả kế hoạch, `ChargingAllocation` là một lần gán request–point–time.
- What-if: `ScenarioStatus`, `RunStatus`. Các kiểu `ScenarioDraft`, `ScenarioCondition`, các `*State`, `ChargingDraft`, `ChargingOverview`, `ChargingSnapshot` là data contracts được mô tả trong method catalogue; không phải class nghiệp vụ độc lập trong diagram hiện tại.
- Fleet dùng `OrderStatus`, `IncidentStatus`, `ResourceType`, `Severity` cùng các DTO trong method catalogue. Không sao chép các kiểu đó vào class diagram Charging/What-if nếu chỉ cần ID hoặc snapshot.

## Quy tắc kiểm tra toàn hệ thống

1. Mỗi class có đúng một module sở hữu; tham chiếu ngoài module dùng tên/ID hoặc hợp đồng service, không vẽ lại nội dung lớp đó.
2. Association và multiplicity biểu diễn quan hệ giữa instance; dependency biểu diễn lời gọi/sử dụng tạm. Không dùng composition/aggregation khi chưa có quy tắc sở hữu vòng đời rõ.
3. Một request có `0..1` allocation (`Waiting` có `0`, `Scheduled`/`Charging` có `1`); một schedule có `0..*` allocation, một point có `0..*` allocation theo lịch sử. `endTime` dự kiến không giải phóng cổng đang `Charging`/`Suspended`; chỉ cấp point khi không còn phiên thực tế chiếm cổng.
4. UC-C03 giữ FCFS: chỉ thay đổi cổng/khoảng sạc, không đổi vị trí chờ. `Cancelled` dùng cho dừng sạc không hoàn thành; không thêm `Interrupted` vào enum Submission 3.
5. Một run What-if gắn baseline và assumptions của chính nó; Failed run không có result công bố; recommendation không thay đổi live state.

## Đường dẫn tài liệu hiện tại

| Module | Diagram | Method descriptions | Test cases |
| --- | --- | --- | --- |
| Hub & Identity | [PNG](hub-identity/01-hub-identity.png) · [PlantUML](hub-identity/01-hub-identity.puml) | [Methods](../method-design/01-hub-identity.md) | [Cases](../test-cases/01-hub-identity.md) |
| Vehicle Rental | [PNG](vehicle-rental/02-vehicle-rental.png) · [PlantUML](vehicle-rental/02-vehicle-rental.puml) | [Methods](../method-design/02-vehicle-rental.md) | [Cases](../test-cases/02-vehicle-rental.md) |
| Parking & Private EV | [PNG](parking/03-parking-private-ev.png) · [PlantUML](parking/03-parking-private-ev.puml) | [Methods](../method-design/03-parking-private-ev.md) | [Cases](../test-cases/03-parking-private-ev.md) |
| Fleet & Incident | [PNG](fleet-incident/04-fleet-incident.png) · [PlantUML](fleet-incident/04-fleet-incident.puml) | [Methods](../method-design/04-fleet-incident.md) | [Cases](../test-cases/04-fleet-incident.md) |
| Smart Charging | [PNG](smart-charging/05-smart-charging.png) · [PlantUML](smart-charging/05-smart-charging.puml) | [Methods](../method-design/05-smart-charging.md) | [Cases](../test-cases/05-smart-charging.md) |
| What-if Simulation | [PNG](what-if/06-what-if.png) · [PlantUML](what-if/06-what-if.puml) | [Methods](../method-design/06-what-if.md) | [Cases](../test-cases/06-what-if.md) |

Các đường dẫn trong bảng trỏ tới bản đang dùng để tổng hợp Submission 3. Lịch sử nguồn đóng góp của từng thành viên được ghi ở bảng đầu; dùng file hiện tại trong từng thư mục để review và render.
