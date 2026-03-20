import csv
import random
from datetime import datetime, timedelta

def generate_sample_csv(filename, num_tx=100):
  accounts = [f"ACC_{str(i).padStart(3, '0')}" for i in range(1, 21)]
  transactions = []

  # Generate a cycle: 1 -> 2 -> 3 -> 1
  transactions.append(["TX_CYC_1", "ACC_001", "ACC_002", 500.0, "2024-03-20 10:00:00"])
  transactions.append(["TX_CYC_2", "ACC_002", "ACC_003", 500.0, "2024-03-20 11:00:00"])
  transactions.append(["TX_CYC_3", "ACC_003", "ACC_001", 500.0, "2024-03-20 12:00:00"])

  # Generate Fan-in (Smurfing): many to ACC_010
  for i in range(11, 21):
      tx_id = f"TX_SMURF_IN_{i}"
      transactions.append([tx_id, f"ACC_{str(i).padStart(3, '0')}", "ACC_010", 100.0, "2024-03-21 09:00:00"])

  # Generate random transactions
  for i in range(num_tx):
      tx_id = f"TX_RAND_{i}"
      s, r = random.sample(accounts, 2)
      amount = round(random.uniform(10, 1000), 2)
      ts = (datetime.now() - timedelta(days=random.randint(0, 5))).strftime("%Y-%m-%d %H:%M:%S")
      transactions.append([tx_id, s, r, amount, ts])

  with open(filename, 'w', newline='') as f:
      writer = csv.writer(f)
      writer.writerow(["transaction_id", "sender_id", "receiver_id", "amount", "timestamp"])
      writer.writerows(transactions)

generate_sample_csv("sample_transactions.csv")
print("Generated sample_transactions.csv")
