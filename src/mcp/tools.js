import ToolRegistry from "@supershaneski/tool-registry";

const toolRegistry = new ToolRegistry()

toolRegistry.register(
  `get_weather`,
  {
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
  },
  async ({ city }) => {
    if (!city) {
        return { status: 'error', message: 'Missing parameter. City is required.' }
    }
    const temperature = 18 + Math.round(5 * Math.random())
    return { city, temperature: `${temperature}°C`, condition: 'Cloudy' }
  }
)

export default toolRegistry