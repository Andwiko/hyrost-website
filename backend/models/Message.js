// Chat Message model (example)
module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    content: { type: DataTypes.TEXT, allowNull: false },
    senderId: { type: DataTypes.INTEGER, allowNull: false },
    receiverId: { type: DataTypes.INTEGER }, // null for group chat
    groupId: { type: DataTypes.INTEGER },
  });
  return Message;
};
