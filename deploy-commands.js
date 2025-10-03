const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'verify',
    description: 'Verify your Roblox account',
    options: [
      {
        name: 'username',
        type: 3, // STRING
        description: 'Your Roblox username',
        required: true
      },
      {
        name: 'action',
        type: 3,
        description: 'start or check',
        required: false
      }
    ]
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Deploying slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Done.');
  } catch (error) {
    console.error(error);
  }
})();
