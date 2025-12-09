import React, { useState, useEffect } from 'react';
import { getIframes } from '../api/iframe';

function IframePage() {
  const [iframes, setIframes] = useState([]);

  useEffect(() => {
    const fetchIframes = async () => {
      try {
        const response = await getIframes();
        setIframes(response.data);
      } catch (error) {
        console.error('Error fetching iframes:', error);
      }
    };
    fetchIframes();
  }, []);

  return (
    <div>
      <h1>Daftar Iframe</h1>
      {iframes.map(iframe => (
        <div key={iframe._id}>
          <h3>{iframe.title}</h3>
          <iframe 
            src={iframe.url} 
            title={iframe.title}
            width={iframe.width || '100%'} 
            height={iframe.height || '500px'}
          />
          <p>{iframe.description}</p>
        </div>
      ))}
    </div>
  );
}

export default IframePage;