import { badge, pageHeader } from "../../shared/components.js";
import { actionForm, button, e, field, input, list, mountRecords, options, panel, select, timeLabel } from "../../shared/records.js";

export function mountFleet(root, context) {
  return mountRecords(root, context, ({ hubs, vehicles, points, orders }, _, memory) => {
    const sourceHub = memory.sourceHubId ?? hubs.find(hub => hub.id === "ktx-a")?.id ?? hubs[0]?.id;
    const sourceVehicleOptions = options(vehicles.filter(v => v.currentHubId === sourceHub && v.status === "AVAILABLE" && v.condition === "OPERATIONAL"), "vehicleId", "name");
    const hubName = id => hubs.find(hub => hub.id === id)?.name ?? id;
    const vehicleName = id => vehicles.find(v => v.vehicleId === id)?.name ?? id;
    return `${pageHeader("Operator Portal", "Fleet & Redistribution", "Inspect the fleet, dispatch transfers and confirm each arrival.")}
      ${panel("Create a transfer", actionForm("fleet.source", select("sourceHubId","Source Hub", options(hubs,"id","name")
        .replace(`value="${e(sourceHub)}"`, `value="${e(sourceHub)}" selected`)), "Select source")
        + actionForm("fleet.create", `<input type="hidden" name="sourceHubId" value="${e(sourceHub)}">`
        + select("destinationHubId","Destination Hub",options(hubs.filter(h=>h.id!==sourceHub && h.status==="Operational"),"id","name"))
        + field("vehicleIds","Available vehicles",`<select name="{{name}}" multiple required>${sourceVehicleOptions}</select>`), "Create transfer"))}
      ${panel("Transfer orders", list(orders, order => `<article>
        <h3>${e(hubName(order.sourceHubId))} → ${e(hubName(order.destinationHubId))} ${badge(order.status)}</h3>
        <p class="records-meta">${e(order.orderId)} · ${timeLabel(order.createdAt)}</p>
        ${order.vehicles.map(v => `<p>${e(vehicleName(v.vehicleId))} · ${v.arrivedAt ? "Arrived " + timeLabel(v.arrivedAt) : "Awaiting arrival"}
          ${!v.arrivedAt && ["Dispatched","Partial","AtRisk"].includes(order.status)
            ? button("Confirm arrival", "fleet.arrive", {orderId:order.orderId,vehicleId:v.vehicleId}) : ""}</p>`).join("")}
        ${order.status === "Planned" ? button("Dispatch", "fleet.dispatch", {orderId:order.orderId})
          + button("Cancel", "fleet.cancel", {orderId:order.orderId}) : ""}
      </article>`, "No transfer orders."))}
      ${panel("Vehicle inspection", list(vehicles,v => `<article><h3>${e(v.name)}</h3><p>${e(v.vehicleId)} · ${e(v.status)} · ${e(v.condition)} · ${v.batteryLevel}% · ${e(hubName(v.currentHubId) ?? "In transit")}</p></article>`, "No shared vehicles."))}
      ${panel("Simulated telemetry",
        actionForm("telemetry.point",select("pointId","Charging point",options(points,"pointId","pointId"))
          + select("status","Observed condition",["Operational","Maintenance","Faulty","Unknown"].map(value=>`<option>${value}</option>`).join("")),"Record point status")
        + actionForm("telemetry.vehicle",select("vehicleId","Vehicle",options(vehicles,"vehicleId","name"))
          + input("batteryPercent","Observed battery (%)",'type="number" min="0" max="100" required'), "Record battery"))}`;
  }, {
    "fleet.source"(input, { memory }) {
      memory.sourceHubId = input.sourceHubId;
      return { ok:true,readOnly:true,message:"Source Hub selected." };
    },
    "telemetry.point"(input,{ api }) { return api.command("telemetry.point",{...input,eventId:crypto.randomUUID()}); },
    "telemetry.vehicle"(input,{ api }) { return api.command("telemetry.vehicle",{...input,eventId:crypto.randomUUID()}); }
  });
}

export function mountIncidents(root, context) {
  return mountRecords(root, context, ({ vehicles, points, incidents }) => {
    return `${pageHeader("Operator Portal", "Incidents", "Track faults and confirm recovery before lifting restrictions.")}
      ${panel("Report a resource fault", actionForm("incident.new",
        select("resource", "Resource", '<optgroup label="Charging points">'
          + points.map(p=>`<option value="point:${e(p.pointId)}">${e(p.pointId)}</option>`).join("")
          + '</optgroup><optgroup label="Shared vehicles">'
          + vehicles.map(v=>`<option value="vehicle:${e(v.vehicleId)}">${e(v.name)}</option>`).join("") + "</optgroup>")
        + input("description","Fault description",'required maxlength="280"'), "Report incident"))}
      ${panel("Incident queue", list(incidents, incident => `<article>
        <h3>${e(incident.pointId ?? incident.vehicleId)} ${badge(incident.status, incident.status === "Open" ? "warning" : "neutral")}</h3>
        <p>${e(incident.description)}</p><p class="records-meta">${e(incident.incidentId)} · ${timeLabel(incident.createdAt)}</p>
        ${incident.status === "Open" ? button("Investigate","incident.investigate",{incidentId:incident.incidentId}) : ""}
        ${["Open","Investigating"].includes(incident.status) ? button("Verify recovery and resolve","incident.resolve", {incidentId:incident.incidentId}) : ""}
        ${incident.status === "Resolved" ? button("Close incident","incident.close",{incidentId:incident.incidentId}) : ""}
      </article>`, "No incidents."))}`;
  }, {
    "incident.new"({ resource, description }, { api }) {
      const [kind,id] = resource.split(":");
      return api.command("incident.report", { description, [kind === "point" ? "pointId" : "vehicleId"]:id });
    },
    "incident.resolve"(input,{ api }) {
      return globalThis.confirm("Confirm that recovery was verified for this resource?")
        ? api.command("incident.resolve",{...input,verified:true})
        : {ok:true,readOnly:true,message:"Incident kept open."};
    }
  });
}
