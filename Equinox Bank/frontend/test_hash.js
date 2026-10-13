const b = require('bcryptjs');
const seedHash = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQvq4aO';
const v1Hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// Try with $2b$ prefix instead of $2a$
const seedHash2b = '$2b$' + seedHash.substring(4);
const v1Hash2b = '$2b$' + v1Hash.substring(4);

console.log('V1 ($2b$) matches admin:', b.compareSync('admin', v1Hash2b));
console.log('Seed ($2b$) matches admin:', b.compareSync('admin', seedHash2b));
console.log('Fresh admin hash:', b.hashSync('admin', 10));

// Try more guesses
const guesses = ['password','Test@12345','seed','test','admin123','passw0rd','P@ssw0rd','letmein','welcome','123456','changeme','Password1','secret','root','demo','guest','sa','bank','equinox','Seed123','seedadmin','Admin123','Bank123','equinox123','banking','user123','customer1','test123','admin1','default'];
guesses.forEach(pw => { if (b.compareSync(pw, seedHash2b)) console.log('FOUND:', pw); });
console.log('Done');
