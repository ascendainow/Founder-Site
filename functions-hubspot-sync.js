/**
 * Netlify Function: HubSpot Sync
 * Creates or updates a HubSpot contact with form data and scoring results
 * 
 * POST /.netlify/functions/hubspot-sync
 */

const fetch = require('node-fetch');

const HUBSPOT_API = 'https://api.hubapi.com';
const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const HUBSPOT_PORTAL_ID = process.env.HUBSPOT_PORTAL_ID;

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Validate token
  if (!HUBSPOT_TOKEN || !HUBSPOT_PORTAL_ID) {
    console.error('Missing HubSpot credentials');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    if (!data.email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    // Build properties object
    const properties = {
      email: data.email,
      firstname: data.firstname || '',
      lastname: data.lastname || '',
      company: data.company || '',
      hs_lead_status: 'SUBSCRIBER',
    };

    // Add optional fields if present
    if (data.revenue_range) properties.revenue_range = data.revenue_range;
    if (data.team_size) properties.team_size = data.team_size;

    // Add question scores if present
    if (data.q1_score) properties.q1_score = String(data.q1_score);
    if (data.q2_score) properties.q2_score = String(data.q2_score);
    if (data.q3_score) properties.q3_score = String(data.q3_score);
    if (data.q4_score) properties.q4_score = String(data.q4_score);
    if (data.q5_score) properties.q5_score = String(data.q5_score);
    if (data.q6_score) properties.q6_score = String(data.q6_score);
    if (data.q7_score) properties.q7_score = String(data.q7_score);

    // Add results if present
    if (data.indicator_total_score) properties.indicator_total_score = String(data.indicator_total_score);
    if (data.indicator_result_category) properties.indicator_result_category = data.indicator_result_category;

    // Add payment tracking if present
    if (data.paid_diagnostic_purchased) properties.paid_diagnostic_purchased = data.paid_diagnostic_purchased;
    if (data.paid_diagnostic_completion_status) properties.paid_diagnostic_completion_status = data.paid_diagnostic_completion_status;

    // First, try to find existing contact by email
    const searchResponse = await fetch(
      `${HUBSPOT_API}/crm/v3/objects/contacts?limit=1&after=0&properties=email`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let contactId;
    let isNewContact = true;

    if (searchResponse.ok) {
      // Search for contact by email filter
      const filterResponse = await fetch(
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
                    value: data.email
                  }
                ]
              }
            ],
            limit: 1
          })
        }
      );

      if (filterResponse.ok) {
        const results = await filterResponse.json();
        if (results.results && results.results.length > 0) {
          contactId = results.results[0].id;
          isNewContact = false;
        }
      }
    }

    // Create or update contact
    let response;
    if (isNewContact) {
      // Create new contact
      response = await fetch(
        `${HUBSPOT_API}/crm/v3/objects/contacts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: properties
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Create contact error:', error);
        return {
          statusCode: response.status,
          body: JSON.stringify({ error: 'Failed to create contact', details: error })
        };
      }

      const result = await response.json();
      contactId = result.id;

    } else {
      // Update existing contact
      response = await fetch(
        `${HUBSPOT_API}/crm/v3/objects/contacts/${contactId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: properties
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Update contact error:', error);
        return {
          statusCode: response.status,
          body: JSON.stringify({ error: 'Failed to update contact', details: error })
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        contact_id: contactId,
        message: isNewContact ? 'Contact created' : 'Contact updated',
        isNewContact
      })
    };

  } catch (error) {
    console.error('HubSpot sync error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to sync with HubSpot', details: error.message })
    };
  }
};
