import React, { useState, useEffect } from 'react';
import { fetchRules } from '../api/rules';

const RulesPage = () => {
  const [rules, setRules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRules = async () => {
      try {
        const data = await fetchRules();
        setRules(data);
      } catch (error) {
        console.error('Error loading rules:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRules();
  }, []);

  if (isLoading) return <div>Memuat aturan...</div>;

  return (
    <div className="rules-container">
      <h1>Aturan Server</h1>
      
      <div className="rules-list">
        {rules.map((rule, index) => (
          <div key={rule._id} className="rule-item">
            <h3>{index + 1}. {rule.title}</h3>
            <p>{rule.description}</p>
            {rule.punishment && (
              <div className="punishment">
                <strong>Hukuman: </strong>{rule.punishment}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RulesPage;