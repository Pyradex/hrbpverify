const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Error running command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Error running command.', ephemeral: true });
    }
  }
});
const axios = require('axios');
const crypto = require('crypto');

const TEMP_CODES = new Map();
const CODE_TTL_MS = 1000 * 60 * 10; // 10 minutes

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'verify_start') {
    // Generate code
    const code = `VERIFY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    TEMP_CODES.set(interaction.user.id, { code, expiresAt: Date.now() + CODE_TTL_MS });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_check')
        .setLabel('🔎 Check Verification')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      embeds: [{
        title: 'Verification Started',
        description: `Put this code in your Roblox **bio** or **display name**:\n\n\`${code}\`\n\nOnce done, click **Check Verification** below.`,
        color: 0x3498db
      }],
      components: [row],
      ephemeral: true
    });
  }

  if (interaction.customId === 'verify_check') {
    const entry = TEMP_CODES.get(interaction.user.id);
    if (!entry) {
      return interaction.reply({ content: 'No active verification found. Click Verify again.', ephemeral: true });
    }
    if (Date.now() > entry.expiresAt) {
      TEMP_CODES.delete(interaction.user.id);
      return interaction.reply({ content: 'Your verification code expired. Please start again.', ephemeral: true });
    }

    // Roblox username input (ask once)
    await interaction.reply({
      content: 'Please reply with your Roblox **username** (type it in chat).',
      ephemeral: true
    });

    // Collect next message
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async m => {
      const robloxName = m.content.trim();

      try {
        // 1) resolve username -> id
        const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
          usernames: [robloxName], excludeBannedUsers: true
        });
        const data = res.data?.data?.[0];
        if (!data) {
          return m.reply('Roblox user not found.');
        }

        const robloxId = data.id;
        const info = await axios.get(`https://users.roblox.com/v1/users/${robloxId}`);
        const displayName = info.data?.displayName || '';
        const desc = info.data?.description || '';

        const code = entry.code;
        if (!(displayName.includes(code) || desc.includes(code))) {
          return m.reply('Code not found in Roblox profile. Make sure you added it to your bio/display name.');
        }

        // success: set nickname
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.setNickname(data.username.slice(0, 32)).catch(() => {});
        TEMP_CODES.delete(interaction.user.id);

        return m.reply(`✅ Verified! Your nickname is now **${data.username}**`);
      } catch (err) {
        console.error(err);
        return m.reply('Error checking Roblox API.');
      }
    });
  }
});


client.login(process.env.TOKEN);
