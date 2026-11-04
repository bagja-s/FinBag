import test from 'node:test';
import assert from 'node:assert/strict';
import { predictCategory } from './categoryMatcher';

test('predictCategory detects food & beverages correctly', () => {
  assert.equal(predictCategory('Makan siang nasi padang'), 'food');
  assert.equal(predictCategory('Beli kopi starbucks americano'), 'food');
  assert.equal(predictCategory('Order GrabFood ayam geprek'), 'food');
  assert.equal(predictCategory('Bakso malang komplit'), 'food');
  assert.equal(predictCategory('Lunch at italian restaurant'), 'food');
});

test('predictCategory detects transportation accurately', () => {
  assert.equal(predictCategory('Isi bensin pertamax 50rb'), 'transport');
  assert.equal(predictCategory('Gojek ke kantor'), 'transport');
  assert.equal(predictCategory('Bayar tol jorr dan parkir'), 'transport');
  assert.equal(predictCategory('Tiket KRL commuter line'), 'transport');
  assert.equal(predictCategory('Taxi fare to airport'), 'transport');
});

test('predictCategory detects utilities & bills', () => {
  assert.equal(predictCategory('Token listrik PLN bulanan'), 'utilities');
  assert.equal(predictCategory('Tagihan wifi indihome 50mbps'), 'utilities');
  assert.equal(predictCategory('Bayar PDAM'), 'utilities');
  assert.equal(predictCategory('Beli paket data telkomsel 25GB'), 'utilities');
});

test('predictCategory detects shopping', () => {
  assert.equal(predictCategory('Belanja mingguan di Indomaret'), 'shopping');
  assert.equal(predictCategory('Checkout Shopee baju kaos'), 'shopping');
  assert.equal(predictCategory('Supermarket Alfamart'), 'shopping');
});

test('predictCategory detects entertainment', () => {
  assert.equal(predictCategory('Nonton bioskop XXI premiere'), 'entertainment');
  assert.equal(predictCategory('Langganan bulanan Netflix'), 'entertainment');
  assert.equal(predictCategory('Beli game di Steam'), 'entertainment');
});

test('predictCategory detects health & medicine', () => {
  assert.equal(predictCategory('Beli obat batuk di Apotek Kimia Farma'), 'health');
  assert.equal(predictCategory('Konsultasi dokter gigi'), 'health');
});

test('predictCategory handles income vs expense correctly', () => {
  assert.equal(predictCategory('Gaji bulanan bulan November', 'income'), 'salary');
  assert.equal(predictCategory('Bonus akhir tahun dan thr', 'income'), 'salary');
});

test('predictCategory returns null for empty or unrecognized strings', () => {
  assert.equal(predictCategory(''), null);
  assert.equal(predictCategory('   '), null);
  assert.equal(predictCategory('xyz 123 random non-existent'), null);
});
