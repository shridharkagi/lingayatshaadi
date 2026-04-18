/** Server-only: prefer IPv4 for outbound HTTPS (avoids Node fetch failures when IPv6 is broken). */
import dns from "node:dns";

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
