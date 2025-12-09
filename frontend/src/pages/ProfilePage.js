import React, { useState } from 'react';

function ProfilePage() {
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleAvatarChange = e => {
    const file = e.target.files[0];
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = e => {
    e.preventDefault();
    // TODO: Upload avatar to backend
    alert('Avatar uploaded (simulasi)!');
  };

  return (
    <div>
      <h2>User Profile</h2>
      <form onSubmit={handleUpload}>
        <label>Avatar:</label><br/>
        <input type="file" accept="image/*" onChange={handleAvatarChange} />
        {preview && <div><img src={preview} alt="avatar preview" style={{width:100,borderRadius:'50%',margin:'10px 0'}} /></div>}
        <button type="submit">Upload Avatar</button>
      </form>
      {/* Add profile info, settings, etc. */}
    </div>
  );
}

export default ProfilePage;
