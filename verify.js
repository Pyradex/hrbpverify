const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');

const TEMP_CODES = new Map();
const CODE_TTL_MS = 1000 * 60 * 10; // 10 min

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your Roblox account')
    .addStringOption(opt =>
      opt.setName('username')
        .setDescription('Your Roblox username')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('action')
        .setDescription('start or check')
        .setRequired(false)),

  async execute(interaction) {
    const action = (interaction.options.getString('action') || 'start').toLowerCase();
    const robloxName = interaction.options.getString('username').trim();
    const discordId = interaction.user.id;

    if (action === 'start') {
      const code = `VERIFY-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      TEMP_CODES.set(discordId, { code, robloxName, expiresAt: Date.now() + CODE_TTL_MS });
      return interaction.reply({
        content: `Put this code in your Roblox bio/display name: \`${code}\`.\nRun \`/verify ${robloxName} check\` after.`,
        ephemeral: true
      });
    }

    if (action === 'check') {
      const entry = TEMP_CODES.get(discordId);
      if (!entry || entry.robloxName.toLowerCase() !== robloxName.toLowerCase()) {
        return interaction.reply({ content: 'No pending verification. Run /verify start first.', ephemeral: true });
      }
      if (Date.now() > entry.expiresAt) {
        TEMP_CODES.delete(discordId);
        return interaction.reply({ content: 'Code expired. Run /verify start again.', ephemeral: true });
      }

      try {
        // resolve username -> ID
        const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
          usernames: [robloxName], excludeBannedUsers: true
        });
        const data = res.data?.data?.[0];
        if (!data) return interaction.reply({ content: 'Roblox user not found.', ephemeral: true });

        const robloxId = data.id;
        const info = await axios.get(`https://users.roblox.com/v1/users/${robloxId}`);
        const displayName = info.data?.displayName || '';
        const desc = info.data?.description || '';

        const code = entry.code;
        if (!(displayName.includes(code) || desc.includes(code))) {
          return interaction.reply({ content: 'Code not found in Roblox profile.', ephemeral: true });
        }

        // success
        const member = await interaction.guild.members.fetch(discordId);
        await member.setNickname(data.username.slice(0, 32)).catch(() => {});
        TEMP_CODES.delete(discordId);
        return interaction.reply({ content: `✅ Verified as **${data.username}**`, ephemeral: true });

      } catch (err) {
        console.error(err);
        return interaction.reply({ content: 'Error contacting Roblox API.', ephemeral: true });
      }
    }
  }
};
