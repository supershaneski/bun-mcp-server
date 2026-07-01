export const metadata = {
  name: 'get_weather',
  title: 'Get Weather',
  description: 'Get the current weather for a given city.',
  parameters: {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'The city to get weather for' }
    },
    required: ['city']
  }
};

export async function handler({ city }) {
  if (!city) {
      return { status: 'error', message: 'Missing parameter. City is required.' }
  }
  const temperature = 18 + Math.round(5 * Math.random())
  return { city, temperature: `${temperature}°C`, condition: 'Cloudy' }
}
