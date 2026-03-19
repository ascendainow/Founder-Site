/**
 * Netlify Function: Fetch User Result
 * Retrieves a contact's indicator score and category from HubSpot
 * Used by results page to display dynamic results
 * 
 * GET /.netlify/functions/fetch-user-result?email=user@example.com
 */

const fetch = require('node-fetch');

const HUBSPOT_API = 'https://api.hubapi.com';
const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;

exports.handler = async (event) => {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Validate token
  if (!HUBSPOT_TOKEN) {
    console.error('Missing HubSpot token');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  try {
    const email = event.queryStringParameters?.email;
    
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email parameter is required' })
      };
    }

    // Properties to retrieve
    const properties = [
      'email',
      'firstname',
      'lastname',
      'company',
      'revenue_range',
      'team_size',
      'q1_score',
      'q2_score',
      'q3_score',
      'q4_score',
      'q5_score',
      'q6_score',
      'q7_score',
      'indicator_total_score',
      'indicator_result_category'
    ];

    // Search for contact by email
    const response = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email
                }
              ]
            }
          ],
          limit: 1,
          sorts: [
            {
              propertyName: 'hs_object_id',
              direction: 'DESCENDING'
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('HubSpot search error:', error);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Contact not found' })
      };
    }

    const contact = data.results[0];
    const props = contact.properties;

    // Extract and format response
    const result = {
      contact_id: contact.id,
      email: props.email,
      firstname: props.firstname || '',
      lastname: props.lastname || '',
      company: props.company || '',
      revenue_range: props.revenue_range || '',
      team_size: props.team_size || '',
      q1_score: parseInt(props.q1_score) || 0,
      q2_score: parseInt(props.q2_score) || 0,
      q3_score: parseInt(props.q3_score) || 0,
      q4_score: parseInt(props.q4_score) || 0,
      q5_score: parseInt(props.q5_score) || 0,
      q6_score: parseInt(props.q6_score) || 0,
      q7_score: parseInt(props.q7_score) || 0,
      score: parseInt(props.indicator_total_score) || 0,
      category: props.indicator_result_category || 'Unknown'
    };

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Fetch error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch user result', details: error.message })
    };
  }
};
