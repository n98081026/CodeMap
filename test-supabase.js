import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://opxeebeerzjzkpnvkwfo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9weGVlYmVlcnpqemtwbnZrd2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3OTAwNjEsImV4cCI6MjA2NzM2NjA2MX0.x81mixG6dV75i8Mx4Tv_qx4_SOKzd6rsdQqclPxUwDM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection and complete setup...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('system_settings').select('*').limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error);
      return;
    }
    
    console.log('✅ Connection successful!');
    console.log('📊 System settings data:', data);
    
    // Test if all tables exist
    const tables = ['profiles', 'classrooms', 'classroom_students', 'concept_maps', 'project_submissions', 'system_settings'];
    
    console.log('\n📋 Testing database tables:');
    for (const table of tables) {
      try {
        const { data: tableData, error: tableError } = await supabase.from(table).select('*').limit(1);
        if (tableError) {
          console.log(`❌ Table ${table}: ${tableError.message}`);
        } else {
          console.log(`✅ Table ${table}: OK`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    // Test storage bucket
    console.log('\n🗂️ Testing storage bucket:');
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.log(`❌ Storage buckets: ${bucketError.message}`);
      } else {
        const projectArchivesBucket = buckets.find(bucket => bucket.id === 'project_archives');
        if (projectArchivesBucket) {
          console.log('✅ Storage bucket "project_archives": OK');
        } else {
          console.log('❌ Storage bucket "project_archives": Not found');
        }
      }
    } catch (err) {
      console.log(`❌ Storage buckets: ${err.message}`);
    }
    
    console.log('\n🎉 Complete setup verification finished!');
    
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
}

testConnection();
