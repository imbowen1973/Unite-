export async function GET(request: Request) {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'unite-platform'
    }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}
