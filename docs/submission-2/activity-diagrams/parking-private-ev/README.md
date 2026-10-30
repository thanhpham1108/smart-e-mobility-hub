# Activity Diagrams - Parking & Private EVs

| Use Case | Name | SVG | PNG | Source |
| --- | --- | --- | --- | --- |
| UC-P01 | Reserve a Parking Space | [SVG](AD_ReserveParkingSpace.svg) | [PNG](AD_ReserveParkingSpace.png) | [PlantUML](AD_ReserveParkingSpace.puml) |
| UC-P02 | Submit a Private-EV Charging Request | [SVG](AD_SubmitPrivateEVChargingRequest.svg) | [PNG](AD_SubmitPrivateEVChargingRequest.png) | [PlantUML](AD_SubmitPrivateEVChargingRequest.puml) |
| UC-P03 | View My Parking and Charging Bookings | [SVG](AD_ViewParkingAndChargingBookings.svg) | [PNG](AD_ViewParkingAndChargingBookings.png) | [PlantUML](AD_ViewParkingAndChargingBookings.puml) |
| UC-P04 | Cancel a Parking Reservation | [SVG](AD_CancelParkingReservation.svg) | [PNG](AD_CancelParkingReservation.png) | [PlantUML](AD_CancelParkingReservation.puml) |
| UC-P05 | Cancel a Charging Request | [SVG](AD_CancelChargingRequest.svg) | [PNG](AD_CancelChargingRequest.png) | [PlantUML](AD_CancelChargingRequest.puml) |
| UC-P06 | Check In a Private EV | [SVG](AD_CheckInPrivateEV.svg) | [PNG](AD_CheckInPrivateEV.png) | [PlantUML](AD_CheckInPrivateEV.puml) |
| UC-P07 | Check Out a Private EV | [SVG](AD_CheckOutPrivateEV.svg) | [PNG](AD_CheckOutPrivateEV.png) | [PlantUML](AD_CheckOutPrivateEV.puml) |

## Regenerate Images

Install Java and download PlantUML. Run these commands from this folder, replacing `/path/to/plantuml.jar` with your JAR location:

```sh
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tsvg *.puml
java -Djava.awt.headless=true -DPLANTUML_LIMIT_SIZE=30000 -jar /path/to/plantuml.jar -failfast2 -tpng *.puml
```
