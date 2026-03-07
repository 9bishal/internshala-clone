export const getBrowserInfo = () => {
  if (typeof window === 'undefined') return "Unknown";
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
  if (userAgent.includes("Edge") || userAgent.includes("Edg")) return "Edge";
  if ((navigator as any).brave !== undefined) return "Brave"; 

  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
  
  return "Unknown";
};

export const getOSInfo = () => {
  if (typeof window === 'undefined') return "Unknown";
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Win")) return "Windows";
  if (userAgent.includes("Mac")) return "macOS";
  if (userAgent.includes("Linux")) return "Linux";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) return "iOS";
  return "Unknown";
};

export const getDeviceType = () => {
  if (typeof window === 'undefined') return "Desktop";
  const userAgent = navigator.userAgent;
  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) return "Mobile";
  if (/tablet|ipad/i.test(userAgent)) return "Tablet";
  return "Desktop";
};
