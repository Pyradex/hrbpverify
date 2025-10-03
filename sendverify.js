const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sendverify')
    .setDescription('Send the verification embed (admin only).'),

  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: 'You need admin permissions.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('High Rock Border Park Community Verification')
      .setDescription('To join the community, please verify your Roblox account.\n\nClick the button below to begin verification.')
      .setColor(0x2ecc71)
      .setFooter({ text: 'High Rock Border Park Community' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify_start')
        .setLabel('✅ Verify')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ content: 'Verification panel created:', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  }
};
