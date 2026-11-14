export function studentShell(path) {
  const nav = [
    ["/student/hubs", "Hubs"], ["/student/rental", "Rentals"], ["/student/parking", "Parking & Charging"]
  ].map(([href, label]) => `<a href="#${href}" ${path === href ? 'aria-current="page"' : ""}>${label}</a>`).join("");
  return `<div class="student-shell">
    <header class="student-header"><a class="student-brand" href="#/student/parking"><span class="brand-mark" aria-hidden="true">S</span><span>VNU-HCM <strong>SmartHub</strong></span></a><nav class="student-nav" aria-label="Student navigation">${nav}</nav><div class="student-tools"><a class="role-switch" href="#/operator/network" aria-label="Switch to Operator portal">Student <span aria-hidden="true">⇄</span></a><span class="avatar" aria-label="Demo student">ST</span></div></header>
    <main class="student-main" id="page-root"></main>
    <footer class="student-footer"><span>VNU-HCM SmartHub · Student Portal</span><span>Local demo · <button type="button" class="text-button" data-reset-demo>Reset demo</button></span></footer>
  </div>`;
}
