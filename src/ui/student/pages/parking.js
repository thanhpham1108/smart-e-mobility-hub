import { badge, pageHeader } from "../../shared/components.js";
import { mountStudentChargingStatus } from "../components/charging-status.js";
import { actionForm, button, e, field, fromLocalInput, list, mountRecords, options, panel, select, timeLabel, toLocalInput } from "../../shared/records.js";

export function mount(root, context) {
  root.innerHTML = '<div data-parking-records></div><div data-charging-status></div>';
  const unmount = mountRecords(root.querySelector("[data-parking-records]"), context, (state, viewer, memory) => {
    const { hubs, privateVehicles, parkingReservations, parkingSessions, notifications } = state;
    const rounded = Math.ceil(Date.parse(state.demoTime) / 900000) * 900000;
    const draft = memory.draft ?? {};
    const renderTime = (name, label, value) => field(name, label, `<input name="{{name}}" type="datetime-local" step="900" value="${e(value)}" required>`);
    const saved = memory.review;
    const optionSelection = (rows, key, label, selected) => options(rows,key,label)
      .replace(`value="${e(selected)}"`,`value="${e(selected)}" selected`);
    return `${pageHeader("Student Portal", "Parking & Charging", "Reserve a parking window and request a compatible charging point.")}
      ${panel("Reserve parking", actionForm("parking.review",
        select("hubId","Mobility Hub",optionSelection(hubs,"id","name",draft.hubId))
        + select("vehicleId","Private vehicle",optionSelection(privateVehicles,"vehicleId","name",draft.vehicleId))
        + renderTime("arrivalTime","Arrival (ICT)",draft.arrivalTime ?? toLocalInput(rounded))
        + renderTime("departureTime","Departure (ICT)",draft.departureTime ?? toLocalInput(rounded + 3600000)), "Review availability")
        + (saved ? `<p>${saved.available ? "Space is available. Check in before " + timeLabel(saved.expiresAt)
          : "No space at " + timeLabel(saved.blockedSlot) + ". Try a different Hub or interval."}</p>
          ${saved.available ? button("Confirm booking", "parking.confirm", {}) : ""}` : ""))}
      ${panel("My bookings", list(parkingReservations, booking => {
        const session = parkingSessions.find(item => item.reservationId === booking.reservationId);
        return `<article><h3>${e(hubs.find(hub => hub.id === booking.hubId)?.name ?? booking.hubId)} ${badge(booking.status)}</h3>
          <p>${e(booking.vehicleId)} · ${timeLabel(booking.arrivalTime)} → ${timeLabel(booking.departureTime)}</p>
          <p class="records-meta">Booking ${e(booking.reservationId)} ${session ? "· Space " + e(session.parkingSpaceId) : "· Check-in deadline " + timeLabel(booking.expiresAt)}</p>
          ${booking.status === "Confirmed" ? button("Check in", "parking.checkIn", { reservationId:booking.reservationId })
            + button("Cancel booking", "parking.cancel", { reservationId:booking.reservationId }) : ""}
          ${booking.status === "Checked In" ? button("Check out", "parking.checkOut", { reservationId:booking.reservationId }) : ""}</article>`;
      }, "No parking bookings."))}
      ${notifications.length ? panel("Charging notifications", list(notifications.slice(0, 5), notice =>
        `<p>${e(notice.message)} <small>${timeLabel(notice.createdAt)}</small></p>`, "")) : ""}`;
  }, {
    async "parking.review"(input, { api, memory }) {
      memory.draft = input;
      memory.review = null;
      const payload = { ...input, arrivalTime:fromLocalInput(input.arrivalTime), departureTime:fromLocalInput(input.departureTime) };
      const result = await api.read("parking.review", payload);
      if (result.ok) { memory.review=result.data; memory.payload=payload; }
      return { ...result, readOnly:true, message:"Availability reviewed." };
    },
    async "parking.confirm"(_, { api, memory }) {
      if (!memory.review?.available) return { ok:false, message:"Review the available parking window first." };
      const result = await api.command("parking.reserve",memory.payload);
      if (result.ok) memory.review=null;
      return result;
    },
    "parking.cancel"(input,{ api }) {
      return globalThis.confirm("Cancel this booking and any unused charging request?") ? api.command("parking.cancel",input) :
        { ok:true, readOnly:true, message:"Booking kept." };
    },
    "parking.checkOut"(input,{ api }) {
      return globalThis.confirm("Check out and release this parking space?") ? api.command("parking.checkOut",input) :
        { ok:true, readOnly:true, message:"Parking visit kept." };
    }
  });
  const unmountCharging = mountStudentChargingStatus(root.querySelector("[data-charging-status]"), {
    ...context, actorId: context.viewer.userId
  });
  return () => { unmount(); unmountCharging(); };
}
