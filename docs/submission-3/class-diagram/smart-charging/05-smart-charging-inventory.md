# Class inventory — Smart Charging (member 5)

**Phạm vi:** UC-C01 (xem hàng đợi/lịch), UC-C02 (tạo lịch FCFS), UC-C03 (điều chỉnh lịch). Đây là bản kiểm kê để chốt class diagram, chưa phải method catalogue hay sơ đồ hoàn chỉnh. Chỉ module Smart Charging định nghĩa các class trong bảng chính.

## 1. Quy tắc thiết kế đã có nguồn

- `ChargingRequest` là nhu cầu sạc được ghi nhận. Request hợp lệ được lưu Scheduled khi cấp được allocation ngay; nếu Hub đầy thì lưu Waiting không allocation, báo Full và vị trí waitlist. Thiếu thời lượng vẫn báo lỗi, không vào hàng; hết khung giờ yêu cầu thì Waiting thành Expired và báo Student.
- `ChargingSchedule` là **kế hoạch sạc của một Hub trong một kỳ lập lịch**, chứa nhiều `ChargingAllocation`. Một allocation mới là lần gán **một request + một charging point + một khoảng thời gian**. Không gọi một khoảng thời gian riêng là toàn bộ schedule.
- UC-C02 xếp request theo `submittedAt` tăng dần (FCFS). Chỉ khi timestamp **bằng hệt nhau** mới xét pin thấp hơn, rồi `requestId` để ổn định thứ tự. Allocation trên cùng point **hoặc cùng vehicle** không được chồng thời gian; service kiểm tra thêm commitment của xe tại Hub khác. Request hợp lệ bị chặn vì Hub đầy được lưu Waiting, không có allocation và có vị trí queue; hết requested window thì Expired và thông báo Student. InsufficientChargingTime vẫn không được lưu hoặc waitlist.
- UC-C01 chỉ đọc; UC-C02 được kích hoạt tự động khi gửi request; UC-C03 chỉ lưu điều chỉnh khi point hoạt động và khoảng thời gian hợp lệ. Lỗi lấy dữ liệu hoặc lưu dữ liệu không được làm mất lịch hợp lệ trước đó.
- Parking sở hữu thời gian đỗ, reservation và checkout. Smart Charging sở hữu request, point, schedule, allocation và việc giải phóng allocation. Fleet sở hữu incident/telemetry intake; trạng thái cổng và các cam kết sạc do Smart Charging kiểm soát. What-if chỉ đọc snapshot/bản sao.

## 2. Các class do Smart Charging sở hữu

| Class | Trách nhiệm duy nhất | Thuộc tính cốt lõi dự kiến | Operation cần xem xét khi vẽ | Chứng cứ |
| --- | --- | --- | --- | --- |
| `ChargingRequest` | Lưu nhu cầu sạc, thứ tự FCFS và trạng thái vòng đời của một yêu cầu. | `requestId`, `hubId`, `vehicleId`, `submittedAt`, `currentBatteryPercent`, `targetBatteryPercent`, `requestedStart`, `requestedEnd`, `estimatedEnergyKwh` (ước lượng theo dung lượng pin giả định của loại xe), `activeSessionId [0..1]`, `status` (Waiting, Scheduled, Charging, Completed, Suspended, Cancelled, Expired), `parkingReservationId [0..1]` (chỉ với xe tư nhân). | Waiting giữ thứ tự FCFS tới khi được cấp allocation, Student hủy hoặc hết requested window; vị trí được tính động và queue được hiển thị trong UC-C01. | UC-C01–C03; Parking `ChargingDraft`; state chart request. |
| `ChargingPoint` | Giữ danh tính, Hub và tình trạng vận hành của một cổng. | `pointId`, `hubId`, `status`, `activeRestrictionIds: Set<String>`, `reconciliationHold`, `statusObservedAt`, `ratedPowerKw`. | `isOperational()`; tiếp nhận tình trạng vật lý, hạn chế theo từng incident và giữ cổng khi telemetry chưa đối chiếu được. | UC-C01–C03; Fleet/Telemetry UC-T03, UC-I03. |
| `ChargingAllocation` | Biểu diễn **một** suất sạc đã gán cho request trên point trong khoảng thời gian. | `allocationId`, `startTime`, `endTime`; liên kết tới `ChargingRequest` và `ChargingPoint`; trạng thái allocation nếu cần lưu lịch sử. | `overlaps(other)` hoặc kiểm tra xung đột qua service; không tự quyết định ưu tiên FCFS. | UC-C02 cấp slot; UC-C03 đổi point/interval; Gantt view. |
| `ChargingSchedule` | Gom các allocation của một Hub thành kế hoạch hiện hành. | `scheduleId`, `hubId`, `periodStart`, `periodEnd`, `generatedAt`, `allocations`; `version` nếu cần phát hiện cập nhật đồng thời của UC-C03. | Truy vấn allocation theo request/point; kiểm tra xung đột của một đề xuất. Việc lưu/đổi toàn bộ lịch nên do service điều phối. | UC-C01 tải lịch hiện tại; UC-C02 lưu lịch; UC-C03 sửa lịch. |
| `ChargingService` | Điều phối ba use case và cung cấp các điểm gọi cho Parking, Fleet, What-if. | Không cần dữ liệu nghiệp vụ riêng trong class diagram; các kho dữ liệu/adapter có thể ẩn sau hợp đồng kiến trúc. | `getQueueAndSchedule(hubId)`; `generateSchedule(hubId)`; `adjustAllocation(..., expectedVersion)`; nhận/hủy request và xác nhận dừng sạc từ Parking; đối chiếu session event, tình trạng vật lý và hạn chế theo từng incident từ Fleet; xuất snapshot chỉ đọc cho What-if. | Ba sequence diagram Smart Charging; hai branch Parking/Fleet; architecture baseline. |

**Giới hạn class:** `ChargingController` và UI trong sequence diagram là lớp điều phối/giao diện ở tầng API/presentation chung. Diagram module có thể dùng `ChargingService` làm điểm vào và không sao chép các lifeline thành class. `ChargingDraft`, `QueueScheduleView` hoặc kiểu snapshot là data contract; chỉ vẽ thành class riêng nếu cần giải thích cấu trúc, không tự động thêm vì chúng xuất hiện trong tham số/kết quả.

## 3. Quan hệ dự kiến và cách đọc số lượng

| Quan hệ | Multiplicity dự kiến | Ý nghĩa |
| --- | --- | --- |
| `ChargingSchedule` — `ChargingAllocation` | Một schedule có `0..*` allocation; mỗi allocation thuộc `1` schedule hiện hành. | Lịch là tập các lần phân bổ, không phải một time slot. Chưa dùng composition cho tới khi quyết định vòng đời allocation khi tạo lại lịch. |
| `ChargingRequest` — `ChargingAllocation` | Một request có `0..1` allocation; request Scheduled/Charging có `1`, request Waiting có `0` cho tới khi được cấp suất. Mỗi allocation thuộc đúng `1` request. | Khi được cấp suất, request thành Scheduled; khi hủy/hết hạn thì rời queue. Hủy/hoàn thành vẫn giữ lịch sử, còn allocation hiện hành được giải phóng. |
| `ChargingPoint` — `ChargingAllocation` | Một point có `0..*` allocation ở các thời điểm khác nhau; mỗi allocation dùng `1` point. | Quy tắc không chồng thời gian là constraint riêng, không thể suy ra chỉ từ multiplicity. |
| `ChargingService` → ba entity và schedule | Dependency, không phải aggregation. | Service đọc, kiểm tra và cập nhật các đối tượng thuộc module. Chỉ vẽ đường cần thiết để hình dễ đọc. |

Các class ngoài module chỉ tham chiếu nếu diagram cần thể hiện điểm nối: `Session`/`HubService` (member 1), `ParkingReservation`/`ParkingService` (member 3), `IncidentService`/`TelemetryAdapter` (member 4), `NetworkSnapshot` (member 6). Không định nghĩa lại thuộc tính hoặc operation của class ngoài module.

## 4. Hợp đồng liên module cần khớp với branch đã nộp

| Bên gọi / bên đọc | Smart Charging phải cung cấp hoặc tiếp nhận | Ranh giới sở hữu |
| --- | --- | --- |
| Parking → Charging | Tạo request từ parking reference, Hub, xe, pin hiện tại/mục tiêu và requested window; trả Scheduled cùng allocation hoặc Waiting cùng vị trí hàng khi capacity đầy; thiếu thời lượng không được waitlist. Đọc trạng thái và allocation để hiển thị booking. | Parking kiểm tra quyền sở hữu, khoảng đỗ và khả năng đỗ; Charging giữ request và chỉ cấp suất khi lập lịch. |
| Parking → Charging | Hủy request Scheduled, giải phóng allocation tương ứng; xử lý dừng Charging/Suspended như bước riêng trước checkout. | Hủy riêng request không hủy parking. Hủy parking/no-show/checkout phải đồng bộ việc giải phóng cam kết sạc. |
| Fleet/Telemetry → Charging | Chuyển observation đã xác minh về point/session, báo lỗi và yêu cầu bỏ hạn chế sau khi incident được giải quyết. | Fleet giữ incident và evidence; Charging quyết định point có còn được cấp mới hay không, giữ các allocation đã cam kết và xác nhận giải phóng. “Idle” không tự hủy lịch tương lai. |
| What-if ← Charging | Snapshot **chỉ đọc** của point, request, allocation/schedule và mức độ tắc nghẽn cần cho mô phỏng. | What-if thay đổi bản sao, không đổi lịch thật. |

Không vẽ toàn bộ API của Parking/Fleet/What-if vào class diagram Smart Charging. Khi chốt diagram, chỉ chọn các operation của `ChargingService` thực sự cần để diễn đạt các hợp đồng trên; mọi operation được vẽ sẽ có một method description tương ứng.

## 5. Quyết định đã chốt và việc đồng bộ tài liệu

1. **Đổi vị trí hàng đợi:** UC-C03 chỉ sửa point/time, không đổi queue sequence để giữ FCFS. Catalogue và scenario Submission 1 đã được đồng bộ; vị trí hàng đợi chỉ hiển thị để tham khảo.
2. **Trạng thái dừng sạc:** Dùng `Cancelled` khi phiên được dừng xác nhận trước lúc đạt mục tiêu; [bản Parking đã chỉnh](../method-design/review/03-parking-private-ev.md) dùng cùng tên để tích hợp sau.
3. **Đủ pin, không cần sạc:** bản nháp được từ chối với `NoChargingRequired` trước khi lưu; không có trạng thái request riêng.
4. **Thời lượng sạc:** UC-C02 dùng required duration; Parking gửi current/target battery và requested window. Mô hình bài tập lớn dùng dung lượng pin giả định theo loại xe trong cấu hình hệ thống (xe tư nhân có một giá trị mặc định), không yêu cầu Student nhập thêm. `estimatedEnergyKwh = (target - current) / 100 × assumedBatteryCapacityKwh`; thời lượng trên mỗi cổng được ước lượng từ năng lượng này và `ratedPowerKw`. Đây là **ước lượng của mô hình**, không phải dữ liệu pin thực đo được.
5. **Tên method liên module:** Các operation của `ChargingService` trong diagram/method catalogue là hợp đồng thiết kế của module này. Bản Parking review dùng các trạng thái và chiều gọi tương ứng; khi merge branch cần chuyển wording đã duyệt vào file canonical.
6. **Nhiều fault trên cùng cổng:** Fleet cho phép nhiều incident độc lập. `activeRestrictionIds` ghi từng ticket; resolve một ticket chỉ xóa chính ID đó, không tự mở cổng khi fault khác còn hiệu lực.
7. **Phiên sạc thực:** Fleet T03 có START/STOP kèm session/vehicle/point, còn state chart Charging có Charging/Suspended. `reconcileSessionEvent` nhận hợp đồng sự kiện đã xác minh và `activeSessionId` để đối chiếu; không suy diễn một phiên sạc từ trạng thái cổng idle.

## 6. Nguồn trong repo

- [Use-case catalogue](../../submission-1/use-case-diagram/use-case-catalogue.md) và [ba scenario Smart Charging](../../submission-1/use-case-scenarios/smart_charging_scheduling.md).
- [Sequence diagrams Smart Charging](../../submission-2/sequence-diagrams/smart-charging/README.md), [state chart request](../../submission-2/state-chart-diagrams/smart-charging/STM_ChargingRequest_Lifecycle.puml), [activity diagrams](../../submission-2/activity-diagrams/smart-charging/README.md).
- [Bảng phân công Submission 3](../task_assignment.md), [architecture baseline](../architectural-design/architecture_baseline.md).
- Branch `origin/docs/sub3-parking-private-ev`, commit `5991c86`: `method-design/03-parking-private-ev.md` và `class-diagram/03-parking-private-ev.puml`.
- Branch `origin/sub4-mem3`, commit `270ef08`: `method-design/04-fleet-incident.md` và `class-diagram/04-fleet-incident.puml`.
- Branch `origin/main`, commit `fd9de76`: `class-diagram/01-hub-identity.puml` và `method-design/01-hub-identity.md`.

Quy tắc ký pháp UML và cách tự kiểm tra hình được giải thích trong [hướng dẫn class diagram](UML_Class_Diagram_Guide.md).
