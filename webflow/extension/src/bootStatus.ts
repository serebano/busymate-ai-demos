/**
 * Busymate Demo Connector — boot diagnostics.
 *
 * Runs once, immediately, before anything else wires up. A silent throw
 * during Designer-API startup (e.g. `setExtensionSize` rejecting before the
 * host has finished its handshake) can leave a panel blank forever with
 * nothing in the console the parent page can see — this module makes that
 * failure visible IN the panel itself instead.
 *
 * Single responsibility: report boot state to one element. No insertion
 * logic, no button wiring.
 */

export async function reportBootStatus(statusEl: HTMLElement): Promise<void> {
  statusEl.textContent = "booting…";
  statusEl.dataset.kind = "busy";

  try {
    if (typeof webflow === "undefined") {
      statusEl.textContent = "boot: window.webflow is undefined (host script never ran or hasn't attached yet)";
      statusEl.dataset.kind = "error";
      return;
    }

    // setExtensionSize is the coordinator's specific suspect for a silent
    // pre-paint rejection — call it explicitly and surface whatever happens.
    await webflow.setExtensionSize("default");
    statusEl.textContent = "boot ok: webflow API present, setExtensionSize resolved";
    statusEl.dataset.kind = "ok";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    statusEl.textContent = `boot FAILED: ${message}`;
    statusEl.dataset.kind = "error";
  }
}
