using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Хачатрян_задание9
{
    public class Record
    {
        [DisplayName("Имя")]
        public String Name { get; set; }

        [DisplayName("Дата рождения")]
        public DateTime Birthday { get; set; }

        [DisplayName("Должность")]
        public String Profession { get; set; }

        [DisplayName("Отдел")]
        public String Department { get; set; }

        [DisplayName("Оклад")]
        public double Money { get; set; }

        public Record()
        {
            Name = "";
            Birthday = DateTime.Today;
            Profession = "";
            Department = "";
            Money = 0;
        }

        public Record(String name, DateTime birthday, String profession, String department, double money)
        {
            Name = name;
            Birthday = birthday;
            Profession = profession;
            Department = department;
            Money = money;
        }

        public override string ToString()
        {
            return Name + ", " + Birthday.ToShortDateString() + " г.р., " + Profession +
                   ", " + Department + ", оклад " + Money + " руб.";
        }
    }
}
