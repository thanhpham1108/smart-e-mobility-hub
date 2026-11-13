# Class inventory — What-if Simulation (member 6, member 5 hỗ trợ)

**Phạm vi:** UC-W01–W05. Đây là thiết kế của module mô phỏng, lấy dữ liệu từ năm module vận hành qua snapshot chỉ đọc. Mọi thay đổi giả lập chỉ xảy ra trên bản sao.

## Class và trách nhiệm

| Class | Trách nhiệm | Thuộc tính cốt lõi | Operation dự kiến | UC |
| --- | --- | --- | --- | --- |
| `WhatIfScenario` | Lưu cấu hình điều kiện giả lập và khoảng thời gian. | `scenarioId`, `name`, `conditions`, `periodStart`, `periodEnd`, `assumptions`, `status` (`Draft`, `ReadyToRun`). | `isReadyToRun()` kiểm tra trạng thái đã được xác nhận. | W01, W02 |
| `NetworkSnapshot` | Giữ baseline nhất quán tại một thời điểm và các phiên bản nguồn; cung cấp bản sao để chạy. | `snapshotId`, `sourceSnapshotId [0..1]` cho bản sao, `capturedAt`, `sourceVersions`, `hubState`, `vehicleState`, `parkingState`, `chargingState`, `incidentState`. | `copyForSimulation()` trả bản sao độc lập với ID mới, tham chiếu baseline gốc. | W02–W05 |
| `SimulationRun` | Theo dõi một lần chạy và vòng đời từ Queued đến Completed/Failed. | `runId`, `status`, `startedAt`, `completedAt [0..1]`, `failureReason [0..1]`. | `isCompleted()` dùng để chặn xem/so sánh run chưa hoàn thành. | W02–W05 |
| `SimulationResult` | Giữ các chỉ số dự đoán và ngữ cảnh baseline của một run hoàn thành. | `resultId`, `serviceCapacity`, `parkingUtilization`, `vehicleAvailability`, `chargingCongestion`, `unservedDemand`. | Không cần operation riêng cho diagram đầu tiên; service đọc và so sánh. | W03, W05 |
| `Recommendation` | Giữ một hành động đề xuất và hiệu quả dự kiến, không tự áp dụng. | `recommendationId`, `type`, `targetHubId [0..1]`, `description`, `expectedEffect`. | Không có lệnh `apply()`; UC-W04 chỉ xem. | W02, W04, W05 |
| `SimulationService` | Xác nhận cấu hình, khởi chạy mô phỏng, trả kết quả/đề xuất và so sánh hai run. | Không giữ trạng thái nghiệp vụ riêng trên hình. | `configureScenario`, `runScenario`, `getResult`, `getRecommendations`, `compareRuns`. | W01–W05 |

`conditions`, các `*State`, `expectedEffect` và kết quả so sánh là data contracts. Chỉ nâng thành class riêng nếu cần giải thích một quan hệ hoặc operation mà sáu class trên không biểu đạt được. Worker, repository, UI và controller trong sequence diagram là thành phần triển khai; không chép chúng thành entity chỉ vì có lifeline.

## Quan hệ và multiplicity dự kiến

| Quan hệ | Multiplicity | Lý do |
| --- | --- | --- |
| `WhatIfScenario` — `SimulationRun` | Một scenario có `0..*` run; mỗi run dùng `1` scenario. | Có thể chạy lại cùng điều kiện trên snapshot mới. |
| `SimulationRun` — `NetworkSnapshot` | Mỗi run thành công bước snapshot gắn `1` baseline; trước đó có `0`. Một snapshot có thể được một hoặc nhiều run tham chiếu; dùng quan hệ đơn giản, không composition. | Run Failed khi lấy snapshot có thể chưa có baseline. |
| `SimulationRun` — `SimulationResult` | Một run có `0..1` result; mỗi result thuộc `1` run. | Failed/Queued chưa có result công bố. |
| `SimulationResult` — `Recommendation` | Một result có `0..*` recommendation; mỗi recommendation thuộc `1` result. | “No Intervention Required” là kết quả hợp lệ với danh sách rỗng và lời giải thích. |
| `SimulationService` → scenario/run/snapshot/result | Dependency. | Service điều phối; không dùng association whole–part cho lời gọi tạm. |

## Ranh giới với module khác

- Snapshot contract thu thập trạng thái Hub & Identity, Rental, Parking, Fleet và Charging trong cùng một lần đọc dưới khóa trạng thái ứng dụng chung; chỉ ghi các phiên bản nguồn riêng lẻ không đủ để chứng minh tính nhất quán. Module What-if không sở hữu `MobilityHub`, `SharedVehicle`, `ParkingReservation`, `ChargingPoint` hoặc `IncidentTicket`.
- Snapshot ghi rõ độ mới và dữ liệu thiếu. Nếu không lấy được baseline nhất quán, run chuyển Failed; không công bố kết quả chưa hoàn tất.
- Mỗi run lưu baseline và assumptions của chính nó. So sánh hai run khác snapshot, giả định hoặc thời hạn phải báo sự khác biệt; không trộn số liệu như thể chúng cùng một baseline.
- Recommendation chỉ là đề xuất để Operator xem. Nó không gọi các service vận hành để thay đổi xe, lịch sạc hoặc chỗ đỗ.

## Nguồn và quyết định

- [UC-W01–W05](../../submission-1/use-case-scenarios/what_if_simulation.md), [sequence diagrams](../../submission-2/sequence-diagrams/what-if-simulation/), [state chart](../../submission-2/state-chart-diagrams/what-if-simulation/SC_SimulationRun.puml).
- [Architecture baseline](../architectural-design/architecture_baseline.md), class/method design của bốn module đã nộp (Hub trên `main`; Rental, Parking, Fleet trên branch riêng).
- Dùng `SimulationResult` và `Recommendation` để UC-W03/W04/W05 nhìn thấy trên class diagram. Chúng bổ sung cho bốn tên class đề xuất ban đầu trong [task assignment](../task_assignment.md).
