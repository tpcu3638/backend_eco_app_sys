export default async function getCwaData(lat: string, long: string) {
  try {
    const req = await fetch(`${process.env.CWA_API_SERVICE}/${lat}/${long}`);
    const res = await req.json();
    return { success: true, data: res, msg: "" };
  } catch (e: any) {
    console.error("Error fetching CWA data:", e);
    return { success: false, data: null, msg: e.message };
  }
}
