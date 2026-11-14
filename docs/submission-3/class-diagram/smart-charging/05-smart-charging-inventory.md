# Class inventory — Smart Charging (member 5)

**Phạm vi:** UC-C01 (xem hàng đợi/lịch), UC-C02 (tạo lịch FCFS), UC-C03 (điều chỉnh lịch). Đây là bản kiểm kê để chốt class diagram, chưa phải method catalogue hay sơ đồ hoàn chỉnh. Chỉ module Smart Charging định nghĩa các class trong bảng chính.

## 1. Quy tắc thiết kế đã có nguồn

- `ChargingRequest` là nhu cầu sạc được ghi nhận. Request hợp lệ được lưu Scheduled khi đến lúc có thể bắt đầu và cổng thực sự rảnh; nếu khung bắt đầu ở tương lai thì lưu Waiting không allocation cho đến lúc đó. Request đã đủ điều kiện nhưng Hub đầy cũng lưu Waiting, báo Full và vị trí waitlist. Ước lượng thời lượng không từ chối request; hết khung giờ yêu cầu thì Waiting thành Expired và báo Student.
- `ChargingSchedule` là **kế hoạch sạc của một Hub trong một kỳ lập lịch**, chứa nhiều `ChargingAllocation`. Một allocation mới là lần gán **một request + một charging point + một khoảng thời gian**. Không gọi một khoảng thời gian riêng là toàn bộ schedule.
- UC-C02 xếp request đủ điều kiện theo `submittedAt` tăng dần (FCFS). Chỉ khi timestamp **bằng hệt nhau** mới xét pin thấp hơn, rồi `requestId` để ổn định thứ tự. Request chưa đến `requestedStart` ở Waiting nhưng chưa được cấp cổng. Service kiểm tra cả commitment của xe tại Hub khác và trạng thái phiên sạc thực: `Charging`/`Suspended` vẫn giữ cổng khi đã qua `endTime` dự kiến. Request đủ điều kiện bị chặn vì Hub đầy được lưu Waiting, không có allocation và có vị trí queue; hết requested window thì Expired và thông báo Student.
- UC-C01 chỉ đọc; UC-C02 được kích hoạt tự động khi gửi request; UC-C03 chỉ lưu điều chỉnh khi point hoạt động và khoảng thời gian hợp lệ. Lỗi lấy dữ liệu hoặc lưu dữ liệu không được làm mất lịch hợp lệ trước đó.
- Parking sở hữu thời gian đỗ, reservation và checkout. Smart Charging sở hữu request, point, schedule, allocation và việc giải phóng allocation. Fleet sở hữu incident/telemetry intake; trạng thái cổng và các cam kết sạc do Smart Charging kiểm soát. What-if chỉ đọc snapshot/bản sao.

## 2. Các class do Smart Charging sở hữu

| Class | Trách nhiệm duy nhất | Thuộc tính cốt lõi dự kiến | Operation cần xem xét khi vẽ | Chứng cứ |
| --- | --- | --- | --- | --- |
| `ChargingRequest` | Lưu nhu cầu sạc, thứ tự FCFS và trạng thái vòng đời của một yêu cầu. | `requestId`, `hubId`, `vehicleId`, `submittedAt`, `currentBatteryPercent`, `targetBatteryPercent`, `requestedStart`, `requestedEnd`, `estimatedEnergyKwh` (ước lượng theo dung lượng pin chung 40 kWh), `activeSessionId [0..1]`, `status` (Waiting, Scheduled, Charging, Completed, Suspended, Cancelled, Expired), `parkingReservationId [0..1]` (chỉ với xe tư nhân). | Waiting giữ thứ tự FCFS tới khi đủ điều kiện và được cấp allocation, Student hủy hoặc hết requested window; vị trí được tính động và queue được hiển thị trong UC-C01. | UC-C01–C03; Parking `ChargingDraft`; state chart request. |
| `ChargingPoint` | Giữ danh tính, Hub và tình trạng vận hành của một cổng. | `pointId`, `hubId`, `status`, `activeRestrictionIds: Set<String>`, `reconciliationHold`, `statusObservedAt`, `ratedPowerKw`. | `isOperational()`; tiếp nhận tình trạng vật lý, hạn chế theo từng incident và giữ cổng khi telemetry chưa đối chiếu được. | UC-C01–C03; Fleet/Telemetry UC-T03, UC-I03. |
| `ChargingAllocation` | Biểu diễn **một** suất sạc đã gán cho request trên point; `endTime` chỉ là thời điểm dự kiến. | `allocationId`, `startTime`, `endTime`; liên kết tới `ChargingRequest` và `ChargingPoint`; trạng thái allocation nếu cần lưu lịch sử. | `overlaps(other)` chỉ xét khoảng dự kiến; service còn kiểm tra phiên sạc thực, không dùng `endTime` để tự giải phóng cổng. | UC-C02 cấp cổng; UC-C03 đổi point/interval; Gantt view. |
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
| Parking → Charging | Tạo request từ parking reference, Hub, xe, pin hiện tại/mục tiêu và requested window; trả Scheduled cùng allocation khi cổng rảnh và đã đến lúc bắt đầu, hoặc Waiting không allocation khi khung bắt đầu ở tương lai hay capacity đầy. Ước lượng thời lượng chỉ hiển thị. Đọc trạng thái và allocation để hiển thị booking. | Parking kiểm tra quyền sở hữu, khoảng đỗ và khả năng đỗ; Charging giữ request và chỉ cấp suất khi lập lịch. |
| Parking → Charging | Hủy request Scheduled, giải phóng allocation tương ứng; xử lý dừng Charging/Suspended như bước riêng trước checkout. | Hủy riêng request không hủy parking. Hủy parking/no-show/checkout phải đồng bộ việc giải phóng cam kết sạc. |
| Fleet/Telemetry → Charging | Chuyển observation đã xác minh về point/session, báo lỗi và yêu cầu bỏ hạn chế sau khi incident được giải quyết. | Fleet giữ incident và evidence; Charging quyết định point có còn được cấp mới hay không, giữ các allocation đã cam kết và xác nhận giải phóng. “Idle” không tự hủy lịch tương lai. |
| What-if ← Charging | Snapshot **chỉ đọc** của point, request, allocation/schedule và mức độ tắc nghẽn cần cho mô phỏng. | What-if thay đổi bản sao, không đổi lịch thật. |

Không vẽ toàn bộ API của Parking/Fleet/What-if vào class diagram Smart Charging. Khi chốt diagram, chỉ chọn các operation của `ChargingService` thực sự cần để diễn đạt các hợp đồng trên; mọi operation được vẽ sẽ có một method description tương ứng.

## 5. Quyết định đã chốt và việc đồng bộ tài liệu

1. **Đổi vị trí hàng đợi:** UC-C03 chỉ sửa point/time, không đổi queue sequence để giữ FCFS. Catalogue và scenario Submission 1 đã được đồng bộ; vị trí hàng đợi chỉ hiển thị để tham khảo.
2. **Trạng thái dừng sạc:** Dùng `Cancelled` khi phiên được dừng xác nhận trước lúc đạt mục tiêu; [Parking method design](../../method-design/03-parking-private-ev.md) dùng cùng tên.
3. **Đủ pin, không cần sạc:** bản nháp được từ chối với `NoChargingRequired` trước khi lưu; không có trạng thái request riêng.
4. **Thời lượng sạc:** Parking gửi current/target battery và requested window. Mô hình bài tập lớn dùng một dung lượng pin giả định 40 kWh và công suất 7 kW cho mọi xe, không yêu cầu Student nhập thêm. `estimatedEnergyKwh = (target - current) / 100 × 40 kWh`; thời lượng ước lượng chỉ để hiển thị, không quyết định nhận request hay thời điểm giải phóng cổng.
5. **Tên method liên module:** Các operation của `ChargingService` trong diagram/method catalogue là hợp đồng thiết kế của module này. [Parking method design](../../method-design/03-parking-private-ev.md) dùng các trạng thái và chiều gọi tương ứng.
6. **Nhiều fault trên cùng cổng:** Fleet cho phép nhiều incident độc lập. `activeRestrictionIds` ghi từng ticket; resolve một ticket chỉ xóa chính ID đó, không tự mở cổng khi fault khác còn hiệu lực.
7. **Phiên sạc thực:** Fleet T03 có START/STOP kèm session/vehicle/point, còn state chart Charging có Charging/Suspended. `reconcileSessionEvent` nhận hợp đồng sự kiện đã xác minh và `activeSessionId` để đối chiếu; không suy diễn một phiên sạc từ trạng thái cổng idle.

## 6. Nguồn trong repo

- [Use-case catalogue](../../../submission-1/use-case-diagram/use-case-catalogue.md) và [ba scenario Smart Charging](../../../submission-1/use-case-scenarios/smart_charging_scheduling.md).
- [Sequence diagrams Smart Charging](../../../submission-2/sequence-diagrams/smart-charging/README.md), [state chart request](../../../submission-2/state-chart-diagrams/smart-charging/STM_ChargingRequest_Lifecycle.puml), [activity diagrams](../../../submission-2/activity-diagrams/smart-charging/README.md).
- [Bảng phân công Submission 3](../../task_assignment.md), [architecture baseline](../../architectural-design/architecture_baseline.md).
- [Parking methods](../../method-design/03-parking-private-ev.md), [Fleet methods](../../method-design/04-fleet-incident.md), [Hub & Identity class diagram](../hub-identity/01-hub-identity.puml).
