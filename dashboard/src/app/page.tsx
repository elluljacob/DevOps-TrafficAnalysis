import styles from "@/styles/home.module.css";
import TrafficDashboard from "@/components/TrafficDashboard"; 

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <TrafficDashboard />
      </main>
    </div>
  );
}